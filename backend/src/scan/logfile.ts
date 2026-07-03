import fs from "fs";
import path from "path";
import { LogLine } from "../types/finding";
import { BranchKey, BRANCH_FINDINGS, BRANCH_LABEL, SeedFinding } from "./seeds";

// Los .log generados viven acá (se crean en runtime al Analizar). Es el artefacto
// que alimenta el Dashboard de logs vía GET /api/logs?branch=.
const LOGS_DIR = path.resolve(__dirname, "..", "..", "generated-logs");

export function logFilePath(branch: BranchKey): string {
  return path.join(LOGS_DIR, `${branch}.log`);
}

// Ruta relativa que se muestra en la UI (no la absoluta del contenedor).
export function logFileLabel(branch: BranchKey): string {
  return `generated-logs/${branch}.log`;
}

function req(i: number): string {
  return `req_${i.toString(16).padStart(8, "0")}`;
}

// Líneas benignas de tráfico sano (health checks) que se intercalan siempre —
// para main/develop/demo-0 son las únicas líneas del archivo.
function benignLines(baseTs: number): LogLine[] {
  const svc = [
    { service: "payment-service", route: "GET /health" },
    { service: "webhook-service", route: "GET /health" },
    { service: "postgres", route: "db.ping" },
  ];
  return svc.map((s, i) => ({
    timestamp: new Date(baseTs + i * 1000).toISOString(),
    level: "info" as const,
    service: s.service,
    route: s.route,
    message: "ok",
    requestId: req(i),
  }));
}

// Construye las líneas de log de una rama: benignas + una línea por hallazgo.
function buildLines(branch: BranchKey): LogLine[] {
  const seeds = BRANCH_FINDINGS[branch];
  // Base determinística por corrida no es necesaria; usamos "ahora" para realismo.
  const baseTs = Date.now() - (seeds.length + 3) * 1000;
  const lines: LogLine[] = benignLines(baseTs);

  seeds.forEach((s, i) => {
    lines.push({
      timestamp: new Date(baseTs + (3 + i) * 1000).toISOString(),
      level: s.log.level,
      service: s.log.service,
      route: s.log.route,
      message: `[${s.ruleId}] ${s.log.message}`,
      requestId: req(100 + i),
      ...(s.log.sourceIp ? { sourceIp: s.log.sourceIp } : {}),
      errorCode: s.log.errorCode,
    });
  });

  return lines;
}

export interface LogSystemView {
  id: string;
  name: string;
  role: string;
  logFile: string;
  findingIds: string[];
}

export interface LogFindingView {
  id: string;
  ruleId: string;
  pciRequirement: string;
  title: string;
  severity: SeedFinding["severity"];
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

export interface BranchLogPayload {
  branch: BranchKey;
  branchLabel: string;
  logFile: string;
  lines: LogLine[];
  findings: LogFindingView[];
  systems: LogSystemView[];
}

// Escribe generated-logs/<branch>.log (JSON-lines) y devuelve el payload que
// consume el Dashboard de logs. Archivo y payload salen del mismo builder, así
// que siempre son consistentes entre sí y con el Dashboard estático.
export function generateBranchLog(branch: BranchKey, scanId: string): BranchLogPayload {
  const lines = buildLines(branch);

  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.writeFileSync(logFilePath(branch), lines.map((l) => JSON.stringify(l)).join("\n") + "\n", "utf8");

  const seeds = BRANCH_FINDINGS[branch];
  const label = logFileLabel(branch);

  // Cada hallazgo → un LogFinding cuyo snippet es la línea de log que lo
  // manifiesta (correlación código↔log directa en el detalle).
  const findings: LogFindingView[] = seeds.map((s) => {
    const idx = lines.findIndex((l) => l.message.startsWith(`[${s.ruleId}]`));
    const line = lines[idx];
    return {
      id: `log_${s.ruleId}`,
      ruleId: s.ruleId,
      pciRequirement: s.pciRequirement,
      title: s.title,
      severity: s.severity,
      source: "log",
      filePath: label,
      lineNumber: idx + 1,
      snippet: JSON.stringify(line, null, 2),
      explanation: s.explanation,
      remediation: s.remediation,
      status: "open",
      scanId,
      createdAt: line.timestamp,
    };
  });

  // Sistemas: base benigna + servicios con hallazgos. Cada servicio agrupa sus
  // findings; los que no tienen quedan OPERATIVOS (0 hallazgos).
  const roleByService: Record<string, string> = {
    "payment-service": "Procesamiento de pagos",
    "webhook-service": "Webhooks de proveedores de pago",
    postgres: "Base de datos",
    build: "Pipeline de build / dependencias",
  };
  const serviceIds = new Set<string>(["payment-service", "webhook-service", "postgres"]);
  seeds.forEach((s) => serviceIds.add(s.log.service));

  const systems: LogSystemView[] = Array.from(serviceIds).map((service) => ({
    id: service,
    name: service,
    role: roleByService[service] ?? service,
    logFile: label,
    findingIds: findings.filter((f) => {
      const seed = seeds.find((s) => s.ruleId === f.ruleId);
      return seed?.log.service === service;
    }).map((f) => f.id),
  }));

  return { branch, branchLabel: BRANCH_LABEL[branch], logFile: label, lines, findings, systems };
}
