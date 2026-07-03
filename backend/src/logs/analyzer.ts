import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env";
import { Severity } from "../types/finding";

// ─────────────────────────────────────────────────────────────────────────────
// Analizador de logs del sistema productivo simulado (log-simulator).
//
// Lee payments-runtime.log (JSON-lines escritas por el servicio log-simulator),
// reconstruye la PILA DE EJECUCIÓN de cada evento agrupando por correlationId,
// y produce lo que consume el Dashboard de Logs:
//   · systems  → los 4 componentes del sistema
//   · findings → un hallazgo por evento con error (con causa raíz + solución)
//   · traces   → los componentes recorridos por cada evento (para el detalle)
//
// La causa raíz / solución NO viene en el .log (el log solo trae síntomas: flujo,
// tipo de error, contexto, stack). Se deriva acá con un analizador determinístico
// por `errorType` — este es el punto de enganche natural para reemplazarlo por una
// llamada a Claude/Gemini (recibe la traza, devuelve rootCause + fix).
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM = "payments-runtime";
const LOG_FILE_NAME = "payments-runtime.log";
const MAX_TRACES = 40; // muestra las trazas más recientes

// Catálogo de los 4 componentes (debe coincidir con log-simulator/server.js).
const COMPONENTS: Array<{ componentId: string; component: string; role: string }> = [
  { componentId: "SVC-GATEWAY", component: "api-gateway", role: "Recepción y ruteo de requests" },
  { componentId: "SVC-PAYPROC", component: "payment-processor", role: "Autorización de cargos" },
  { componentId: "SVC-LEDGER", component: "ledger-db", role: "Persistencia y conciliación" },
  { componentId: "SVC-NOTIFY", component: "notification-worker", role: "Notificaciones y webhooks" },
];

// Analizador determinístico por tipo de error. Consume los síntomas del log y
// devuelve la clasificación + causa raíz + solución. (Hook para IA: reemplazar
// el cuerpo por una llamada a Claude pasándole la traza reconstruida.)
interface Analysis {
  title: string;
  severity: Severity;
  pciRequirement: string;
  rootCause: string;
  suggestedFix: string;
}
const KNOWLEDGE: Record<string, Analysis> = {
  SchemaValidationError: {
    title: "Validación de esquema tardía en api-gateway",
    severity: "medium",
    pciRequirement: "6.2.4",
    rootCause:
      "El api-gateway aceptó y ruteó una request cuyo cuerpo no cumple el contrato (falta el campo 'amount'). La validación de esquema se ejecuta demasiado tarde o es incompleta en el borde, dejando pasar payloads malformados al resto del flujo.",
    suggestedFix:
      "Validar el esquema del payload en el borde (api-gateway) antes de rutear, rechazando con 400 los cuerpos malformados. Agregar contract tests del endpoint POST /charge que fallen si el esquema cambia.",
  },
  AuthorizationTimeout: {
    title: "Timeout de autorización en payment-processor",
    severity: "high",
    pciRequirement: "6.2.4",
    rootCause:
      "payment-processor superó el umbral de 500 ms esperando al gateway externo (observado 820 ms). No hay timeout ni circuit-breaker configurado, así que la ejecución queda colgada y el cargo no se resuelve de forma determinística.",
    suggestedFix:
      "Definir un timeout explícito por debajo del umbral, reintentos idempotentes con backoff y un circuit-breaker hacia el gateway. Monitorear la latencia p95 del proveedor y degradar de forma controlada cuando se supere.",
  },
  ConnectionPoolExhausted: {
    title: "Pool de conexiones agotado en ledger-db",
    severity: "high",
    pciRequirement: "10.7.2",
    rootCause:
      "El pool de Postgres de ledger-db llegó a su límite (10/10 conexiones activas, 7 en espera). Indica conexiones que no se liberan (fugas) o un pool subdimensionado para la concurrencia real, bloqueando la persistencia de la transacción.",
    suggestedFix:
      "Auditar fugas de conexión (garantizar release() en finally), dimensionar el pool acorde a la concurrencia observada y agregar una alerta cuando la saturación del pool supere un umbral sostenido.",
  },
  WebhookDeliveryFailed: {
    title: "Entrega de webhook fallida en notification-worker",
    severity: "medium",
    pciRequirement: "10.7.2",
    rootCause:
      "notification-worker agotó 5 reintentos entregando el webhook al merchant (último estado 503). El endpoint destino está caído o saturado y no hay una cola de reintentos diferida, por lo que la notificación se pierde.",
    suggestedFix:
      "Encolar los webhooks fallidos en una dead-letter queue con reintentos exponenciales diferidos y alertar tras N fallos. No bloquear ni marcar como fallido el flujo de pago por una notificación no entregada.",
  },
};

function analyze(errorType: string): Analysis {
  return (
    KNOWLEDGE[errorType] ?? {
      title: `Error no catalogado (${errorType})`,
      severity: "medium",
      pciRequirement: "10.7.2",
      rootCause: "Evento de error sin causa raíz catalogada; revisar la traza completa y el contexto adjunto.",
      suggestedFix: "Analizar la traza correlacionada y el stack para determinar la causa; agregar el patrón al catálogo.",
    }
  );
}

// ── Tipos de salida (consumidos por el frontend) ────────────────────────────
interface RawLine {
  ts: string;
  level: "info" | "error";
  system: string;
  correlationId: string;
  seq: number;
  componentId: string;
  component: string;
  action: string;
  status: "ok" | "error";
  durationMs?: number;
  flow?: string[];
  message: string;
  errorType?: string;
  context?: Record<string, unknown>;
  stack?: string[];
  _fileLine: number; // posición 1-based en el archivo
}

export interface TraceComponent {
  id: string;
  name: string;
  type: string;
  status: "ok" | "warning" | "error";
  line: number;
  snippetStart: number;
  snippet: string;
}

interface LogFinding {
  id: string;
  ruleId: string;
  pciRequirement: string;
  title: string;
  severity: Severity;
  source: "log";
  filePath: string;
  lineNumber: number;
  snippet: string;
  explanation: string;
  remediation: string;
  status: "open";
  scanId: string;
  createdAt: string;
}

interface LogSystemView {
  id: string;
  name: string;
  role: string;
  logFile: string;
  findingIds: string[];
}

export interface LiveLogPayload {
  system: string;
  logFile: string;
  generatedAt: string;
  lineCount: number;
  findings: LogFinding[];
  systems: LogSystemView[];
  traces: Record<string, { traceId: string; components: TraceComponent[] }>;
}

function readRawLines(): RawLine[] {
  const file = path.join(env.simLogDir, LOG_FILE_NAME);
  let content: string;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return []; // aún no se ha generado ningún log
  }
  const out: RawLine[] = [];
  content.split("\n").forEach((raw, i) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    try {
      const obj = JSON.parse(trimmed);
      obj._fileLine = i + 1;
      out.push(obj as RawLine);
    } catch {
      // línea corrupta/parcial — se ignora de forma defensiva
    }
  });
  return out;
}

// Renderiza la pila de ejecución completa de una traza como texto legible
// (lo que muestra el visor de código del detalle del hallazgo).
function renderStack(frames: RawLine[]): { text: string; errorFrameLine: number } {
  const lines: string[] = [];
  let errorFrameLine = 1;
  frames.forEach((f) => {
    if (f.status === "error") errorFrameLine = lines.length + 1;
    const head = `#${f.seq}  ${f.component} (${f.componentId})  ${f.action} → ${f.status.toUpperCase()}${
      f.durationMs != null ? `  (${f.durationMs}ms)` : ""
    }`;
    lines.push(head);
    if (f.status === "error") {
      lines.push(`      ✗ ${f.errorType}: ${f.message}`);
      if (f.context) lines.push(`      context: ${JSON.stringify(f.context)}`);
      (f.stack ?? []).forEach((s) => lines.push(`        ${s}`));
    }
  });
  return { text: lines.join("\n"), errorFrameLine };
}

export function buildLiveLogPayload(): LiveLogPayload {
  const raw = readRawLines();
  const logFile = LOG_FILE_NAME;
  const generatedAt = new Date().toISOString();

  // Agrupa por correlationId preservando el orden de aparición.
  const byTrace = new Map<string, RawLine[]>();
  for (const line of raw) {
    if (!byTrace.has(line.correlationId)) byTrace.set(line.correlationId, []);
    byTrace.get(line.correlationId)!.push(line);
  }

  // Trazas más recientes primero.
  const traceIds = Array.from(byTrace.keys()).reverse().slice(0, MAX_TRACES);

  const findings: LogFinding[] = [];
  const traces: LiveLogPayload["traces"] = {};

  for (const cid of traceIds) {
    const frames = byTrace.get(cid)!.slice().sort((a, b) => a.seq - b.seq);
    const errorFrame = frames.find((f) => f.status === "error");
    if (!errorFrame || !errorFrame.errorType) continue;

    const a = analyze(errorFrame.errorType);
    const { text: stackText } = renderStack(frames);

    findings.push({
      id: cid,
      ruleId: errorFrame.errorType,
      pciRequirement: a.pciRequirement,
      title: a.title,
      severity: a.severity,
      source: "log",
      filePath: logFile,
      lineNumber: errorFrame._fileLine,
      snippet: stackText,
      explanation: a.rootCause,
      remediation: a.suggestedFix,
      status: "open",
      scanId: SYSTEM,
      createdAt: errorFrame.ts,
    });

    traces[cid] = {
      traceId: cid,
      components: frames.map((f) => ({
        id: `${cid}_${f.seq}`,
        name: f.component,
        type: f.componentId,
        status: f.status === "error" ? "error" : "ok",
        line: f._fileLine,
        snippetStart: f._fileLine,
        snippet: JSON.stringify(
          {
            ts: f.ts,
            level: f.level,
            correlationId: f.correlationId,
            componentId: f.componentId,
            component: f.component,
            action: f.action,
            status: f.status,
            ...(f.errorType ? { errorType: f.errorType } : {}),
            message: f.message,
            ...(f.context ? { context: f.context } : {}),
            ...(f.stack ? { stack: f.stack } : {}),
          },
          null,
          2
        ),
      })),
    };
  }

  // Los 4 componentes como "sistemas"; findingIds = eventos donde ESE componente
  // fue el que falló (para "identificar en cuál de los 4 se generó el problema").
  const systems: LogSystemView[] = COMPONENTS.map((c) => ({
    id: c.componentId,
    name: c.component,
    role: c.role,
    logFile,
    findingIds: findings
      .filter((f) => {
        const frames = byTrace.get(f.id)!;
        return frames.some((fr) => fr.status === "error" && fr.componentId === c.componentId);
      })
      .map((f) => f.id),
  }));

  return { system: SYSTEM, logFile, generatedAt, lineCount: raw.length, findings, systems, traces };
}
