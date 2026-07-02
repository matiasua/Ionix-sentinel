// Portado de frontend/design/ionix-sentinel.dc.html — datos del Dashboard de logs (Fase 2, stretch).
// No hay backend todavía para esto (sin /api/log-systems); es 100% mock por ahora.
import type { Finding, Severity } from "../api/client";

export const logFindings: Finding[] = [
  {
    id: "lf_01",
    ruleId: "SENTINEL-LOG-002",
    pciRequirement: "3.4",
    title: "PAN completo registrado en logs de aplicación",
    severity: "high",
    source: "log",
    filePath: "logs/payment-service.log",
    lineNumber: 4210,
    snippet:
      '2026-07-01T18:22:10Z INFO  charge.requested amount=45990 currency=CLP\n2026-07-01T18:22:10Z DEBUG gateway.payload {"card":"4532015112830366","cvv_present":true}\n2026-07-01T18:22:11Z INFO  charge.approved auth_code=88431',
    explanation:
      "El log de nivel DEBUG serializa el payload completo enviado al gateway, incluyendo el PAN sin enmascarar. Los logs se replican a observabilidad y respaldos fuera del entorno de datos de tarjeta, extendiendo el alcance PCI a toda la cadena de logging y violando el requisito 3.4.",
    remediation:
      "Implemente un filtro de sanitización en el logger que enmascare el PAN (BIN + últimos 4: 453201******0366) antes de escribir cualquier registro. Purgue los logs históricos con PAN y agregue un test que falle si un patrón de PAN aparece en la salida de logging.",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:14:25Z",
  },
  {
    id: "lf_02",
    ruleId: "SENTINEL-AUD-004",
    pciRequirement: "10.2.1",
    title: "Accesos a datos de tarjeta no auditados",
    severity: "medium",
    source: "log",
    filePath: "logs/payment-service.log",
    lineNumber: 512,
    snippet:
      "2026-07-01T09:03:11Z INFO  card.read customer_id=88213\n2026-07-01T09:03:11Z INFO  card.read customer_id=88214\n2026-07-01T09:03:12Z INFO  card.read customer_id=88215\n# sin identidad de usuario ni resultado del acceso",
    explanation:
      "Las lecturas de datos de tarjeta se registran sin la identidad del usuario que realizó el acceso ni el resultado de la operación. El requisito 10.2.1 exige registrar todos los accesos individuales a datos del titular con user id, tipo de evento y resultado; sin esto no es posible reconstruir quién accedió a qué.",
    remediation:
      "Enriquezca el evento de auditoría con actor (user id o service account), timestamp sincronizado, tipo de evento, identificador del recurso y resultado (éxito/fallo). Centralice el trail en un almacén de solo-append y restrinja su modificación.",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:15:02Z",
  },
  {
    id: "lf_03",
    ruleId: "SENTINEL-CRED-007",
    pciRequirement: "8.3.1",
    title: "Credencial en texto plano en log de depuración",
    severity: "high",
    source: "log",
    filePath: "logs/auth-service.log",
    lineNumber: 88,
    snippet:
      '2026-07-01T14:10:02Z DEBUG login.attempt user=operador@ionix.cl\n2026-07-01T14:10:02Z DEBUG login.payload {"password":"Verano2026!"}\n2026-07-01T14:10:03Z INFO  login.success user=operador@ionix.cl',
    explanation:
      "El servicio de autenticación registra la contraseña del usuario en claro en el log de depuración. El requisito 8.3.1 exige que las credenciales sean ilegibles durante transmisión y almacenamiento; una contraseña en log queda expuesta a cualquier operador con acceso a observabilidad y compromete todas las sesiones del usuario.",
    remediation:
      "Elimine el logging del payload de autenticación y agregue una regla que redacte campos sensibles (password, token, secret) del logger. Rote las credenciales expuestas en los logs afectados y purgue esos registros del backend de observabilidad.",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:15:20Z",
  },
  {
    id: "lf_04",
    ruleId: "SENTINEL-AUD-002",
    pciRequirement: "10.2.4",
    title: "Intentos fallidos de autenticación no registrados",
    severity: "medium",
    source: "log",
    filePath: "logs/auth-service.log",
    lineNumber: 140,
    snippet:
      "2026-07-01T14:22:40Z INFO  login.success user=admin@ionix.cl\n2026-07-01T14:23:05Z INFO  login.success user=admin@ionix.cl\n# 6 intentos fallidos previos no aparecen en el trail",
    explanation:
      "El log solo registra autenticaciones exitosas; los intentos fallidos no dejan rastro. El requisito 10.2.4 exige registrar todos los intentos de acceso lógico inválidos, insumo esencial para detectar ataques de fuerza bruta y credential stuffing contra el entorno de datos.",
    remediation:
      "Registre cada intento fallido con user id, origen (IP), timestamp y motivo del fallo. Conecte el conteo de fallos a una alerta de bloqueo tras 6 intentos (requisito 8.3.4) y envíe los eventos al SIEM para correlación.",
    status: "acknowledged",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:15:33Z",
  },
  {
    id: "lf_05",
    ruleId: "SENTINEL-HDR-001",
    pciRequirement: "2.2.5",
    title: "Versión del servidor expuesta en headers HTTP",
    severity: "low",
    source: "log",
    filePath: "logs/edge-proxy.log",
    lineNumber: 1187,
    snippet:
      "2026-07-01T12:03:44Z GET /api/health 200\n< Server: nginx/1.18.0 (Ubuntu)\n< X-Powered-By: Express\n2026-07-01T12:03:45Z GET /api/version 200",
    explanation:
      "Las respuestas HTTP exponen la versión exacta de nginx y el framework de aplicación. El requisito 2.2.5 pide eliminar información que facilite el reconocimiento; conocer la versión permite a un atacante buscar exploits específicos sin esfuerzo de fingerprinting.",
    remediation:
      "Configure server_tokens off en nginx y app.disable('x-powered-by') en Express. Verifique con curl -I sobre todos los endpoints públicos que ningún header revele versiones y agregue la comprobación al smoke test post-despliegue.",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:15:44Z",
  },
  {
    id: "lf_06",
    ruleId: "SENTINEL-LOG-006",
    pciRequirement: "10.6.1",
    title: "Desincronización horaria en eventos de auditoría",
    severity: "low",
    source: "log",
    filePath: "logs/audit-worker.log",
    lineNumber: 77,
    snippet:
      "2026-07-01T03:00:01Z event.persisted id=A-8841\n2026-07-01T02:59:58Z event.persisted id=A-8842   # reloj atrasado 3s\n2026-07-01T03:00:04Z event.persisted id=A-8843",
    explanation:
      "Los timestamps de eventos consecutivos retroceden en el tiempo: el contenedor de auditoría no sincroniza su reloj contra una fuente NTP confiable. El requisito 10.6.1 exige sincronización horaria para correlacionar eventos; sin ella los timestamps no son confiables como evidencia forense.",
    remediation:
      "Configure el host con chrony apuntando a servidores NTP internos autenticados; los contenedores heredan el reloj del kernel del host. Documente la fuente de tiempo en el inventario PCI y alerte si la deriva supera 1 segundo.",
    status: "resolved",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:15:51Z",
  },
  {
    id: "lf_07",
    ruleId: "SENTINEL-LOG-009",
    pciRequirement: "10.5.1",
    title: "Rotación de logs de auditoría deshabilitada",
    severity: "medium",
    source: "log",
    filePath: "logs/audit-worker.log",
    lineNumber: 33,
    snippet: "logrotate.conf:\n/var/log/audit/*.log {\n  # rotate 0   -> rotación desactivada\n  missingok\n}",
    explanation:
      "La rotación de logs de auditoría está desactivada (rotate 0). El requisito 10.5.1 exige proteger y retener los logs de auditoría; sin rotación ni respaldo, el disco puede llenarse y detener el logging, o los registros pueden sobrescribirse perdiendo el trail requerido de 12 meses.",
    remediation:
      "Habilite rotación diaria con retención mínima de 3 meses en línea y 12 meses en archivo (rotate 90 + copia a almacenamiento inmutable). Alerte cuando la partición de logs supere el 80% de uso.",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:16:04Z",
  },
];

export const logSnippetStart: Record<string, number> = {
  lf_01: 4209,
  lf_02: 510,
  lf_03: 86,
  lf_04: 138,
  lf_05: 1186,
  lf_06: 75,
  lf_07: 31,
};

export interface TraceComponent {
  id: string;
  name: string;
  type: string;
  status: "ok" | "warning" | "error";
  line: number;
  snippetStart: number;
  snippet: string;
}

export interface LogSystem {
  id: string;
  name: string;
  logFile: string;
  role: string;
  findingIds: string[];
  traceId: string;
  components: TraceComponent[];
}

export const logSystems: LogSystem[] = [
  {
    id: "sys_payment",
    name: "payment-service",
    logFile: "logs/payment-service.log",
    role: "Procesamiento de pagos",
    findingIds: ["lf_01", "lf_02"],
    traceId: "req_7f3a9c2e",
    components: [
      { id: "c_pay_gw", name: "API Gateway", type: "Gateway", status: "ok", line: 4180, snippetStart: 4178, snippet: "[req_7f3a9c2e] gateway.in POST /v1/charges client=merchant_18\n[req_7f3a9c2e] gateway.auth ok scope=charges:write\n[req_7f3a9c2e] gateway.route -> payment-service (48 ms)" },
      { id: "c_pay_svc", name: "payment-service", type: "Servicio", status: "error", line: 4210, snippetStart: 4208, snippet: '[req_7f3a9c2e] charge.requested amount=45990 currency=CLP\n[req_7f3a9c2e] gateway.forward -> stripe\n[req_7f3a9c2e] DEBUG gateway.payload {"card":"4532015112830366","cvv_present":true}' },
      { id: "c_pay_db", name: "PostgreSQL", type: "Base de datos", status: "ok", line: 4225, snippetStart: 4223, snippet: "[req_7f3a9c2e] db.query INSERT INTO payments (customer_id, amount_clp)\n[req_7f3a9c2e] db.rows affected=1\n[req_7f3a9c2e] db.commit tx=88431 (12 ms)" },
      { id: "c_pay_ext", name: "Stripe API", type: "API externa", status: "warning", line: 4240, snippetStart: 4238, snippet: "[req_7f3a9c2e] stripe.call POST /v1/charges\n[req_7f3a9c2e] stripe.latency 820ms (umbral 500ms)\n[req_7f3a9c2e] stripe.resp 200 id=ch_1P9x...aQ" },
    ],
  },
  {
    id: "sys_auth",
    name: "auth-service",
    logFile: "logs/auth-service.log",
    role: "Autenticación y sesiones",
    findingIds: ["lf_03", "lf_04"],
    traceId: "req_2b8e14af",
    components: [
      { id: "c_au_gw", name: "API Gateway", type: "Gateway", status: "ok", line: 84, snippetStart: 82, snippet: "[req_2b8e14af] gateway.in POST /v1/login\n[req_2b8e14af] gateway.route -> auth-service (36 ms)\n[req_2b8e14af] session.new sid=pending" },
      { id: "c_au_svc", name: "auth-service", type: "Servicio", status: "error", line: 88, snippetStart: 86, snippet: '[req_2b8e14af] login.attempt user=operador@ionix.cl\n[req_2b8e14af] DEBUG login.payload {"password":"Verano2026!"}\n[req_2b8e14af] login.success user=operador@ionix.cl' },
      { id: "c_au_redis", name: "Redis", type: "Cache/sesiones", status: "ok", line: 95, snippetStart: 93, snippet: "[req_2b8e14af] session.store sid=8f21c key=sess:8f21c\n[req_2b8e14af] session.ttl 900s\n[req_2b8e14af] redis.ok (3 ms)" },
      { id: "c_au_ldap", name: "LDAP corporativo", type: "Directorio", status: "warning", line: 101, snippetStart: 99, snippet: "[req_2b8e14af] ldap.bind cn=operador,ou=ops\n[req_2b8e14af] ldap.latency 640ms (umbral 300ms)\n[req_2b8e14af] ldap.groups=[pagos,ops]" },
    ],
  },
  {
    id: "sys_edge",
    name: "edge-proxy",
    logFile: "logs/edge-proxy.log",
    role: "Proxy perimetral / TLS",
    findingIds: ["lf_05"],
    traceId: "req_c41d77b0",
    components: [
      { id: "c_ed_cli", name: "Cliente", type: "Origen", status: "ok", line: 1184, snippetStart: 1182, snippet: "[req_c41d77b0] tls.handshake TLSv1.2 cipher=ECDHE-RSA-AES128\n[req_c41d77b0] http.in GET /api/health\n[req_c41d77b0] proxy.accept" },
      { id: "c_ed_proxy", name: "edge-proxy", type: "Proxy", status: "warning", line: 1187, snippetStart: 1185, snippet: "[req_c41d77b0] proxy.upstream 200\n[req_c41d77b0] resp.header < Server: nginx/1.18.0 (Ubuntu)\n[req_c41d77b0] resp.header < X-Powered-By: Express" },
      { id: "c_ed_up", name: "Upstream API", type: "Backend", status: "ok", line: 1192, snippetStart: 1190, snippet: "[req_c41d77b0] upstream.call GET /health\n[req_c41d77b0] upstream.resp 200 (54 ms)\n[req_c41d77b0] proxy.done" },
    ],
  },
  {
    id: "sys_ledger",
    name: "ledger-worker",
    logFile: "logs/ledger-worker.log",
    role: "Conciliación contable",
    findingIds: [],
    traceId: "job_9a5f30d1",
    components: [
      { id: "c_lg_sch", name: "Scheduler", type: "Cron", status: "ok", line: 210, snippetStart: 208, snippet: "[job_9a5f30d1] cron.trigger reconcile.daily\n[job_9a5f30d1] job.start window=2026-07-01\n[job_9a5f30d1] dispatch -> ledger-worker" },
      { id: "c_lg_wrk", name: "ledger-worker", type: "Worker", status: "ok", line: 214, snippetStart: 212, snippet: "[job_9a5f30d1] ledger.load entries=1284\n[job_9a5f30d1] ledger.match matched=1284 orphans=0\n[job_9a5f30d1] ledger.summary ok (210 ms)" },
      { id: "c_lg_db", name: "PostgreSQL", type: "Base de datos", status: "ok", line: 220, snippetStart: 218, snippet: "[job_9a5f30d1] db.query SELECT * FROM ledger_entries\n[job_9a5f30d1] db.rows 1284\n[job_9a5f30d1] db.ok (9 ms)" },
    ],
  },
  {
    id: "sys_audit",
    name: "audit-worker",
    logFile: "logs/audit-worker.log",
    role: "Trail de auditoría",
    findingIds: ["lf_06", "lf_07"],
    traceId: "evt_5d2c8b6e",
    components: [
      { id: "c_ad_bus", name: "Event Bus", type: "Mensajería", status: "ok", line: 70, snippetStart: 68, snippet: "[evt_5d2c8b6e] bus.consume topic=audit.events\n[evt_5d2c8b6e] bus.deliver -> audit-worker (22 ms)\n[evt_5d2c8b6e] ack pending" },
      { id: "c_ad_wrk", name: "audit-worker", type: "Worker", status: "warning", line: 77, snippetStart: 75, snippet: "[evt_5d2c8b6e] event.persisted id=A-8841\n[evt_5d2c8b6e] event.persisted id=A-8842   # reloj atrasado 3s\n[evt_5d2c8b6e] event.persisted id=A-8843" },
      { id: "c_ad_s3", name: "S3 Audit Store", type: "Almacenamiento", status: "ok", line: 84, snippetStart: 82, snippet: "[evt_5d2c8b6e] s3.put audit/2026/07/A-8841.json\n[evt_5d2c8b6e] s3.ok etag=9f2a (130 ms)\n[evt_5d2c8b6e] ack done" },
    ],
  },
];

export const COMP_META: Record<TraceComponent["status"], { color: string; label: string }> = {
  ok: { color: "#79BE96", label: "Operativo" },
  warning: { color: "#E8C77A", label: "Atención" },
  error: { color: "#FF7A76", label: "Error" },
};

// Traza de componentes por incidente (finding), correlacionada por traceId.
export const findingTraces: Record<string, { traceId: string; components: TraceComponent[] }> = {
  lf_01: { traceId: "req_7f3a9c2e", components: logSystems[0].components },
  lf_02: {
    traceId: "req_3c1088fd",
    components: [
      { id: "cp1", name: "API Gateway", type: "Gateway", status: "ok", line: 508, snippetStart: 506, snippet: "[req_3c1088fd] gateway.in GET /v1/customers/88213/cards\n[req_3c1088fd] gateway.auth ok scope=cards:read\n[req_3c1088fd] gateway.route -> payment-service (41 ms)" },
      { id: "cp2", name: "payment-service", type: "Servicio", status: "error", line: 512, snippetStart: 510, snippet: "[req_3c1088fd] card.read customer_id=88213\n[req_3c1088fd] card.read customer_id=88214\n[req_3c1088fd] card.read customer_id=88215   # sin actor ni resultado" },
      { id: "cp3", name: "PostgreSQL", type: "Base de datos", status: "ok", line: 517, snippetStart: 515, snippet: "[req_3c1088fd] db.select FROM cards WHERE customer_id IN (...)\n[req_3c1088fd] db.rows 3\n[req_3c1088fd] db.ok (8 ms)" },
    ],
  },
  lf_03: { traceId: "req_2b8e14af", components: logSystems[1].components },
  lf_04: {
    traceId: "req_9d47a2c0",
    components: [
      { id: "cp1", name: "API Gateway", type: "Gateway", status: "ok", line: 137, snippetStart: 135, snippet: "[req_9d47a2c0] gateway.in POST /v1/login\n[req_9d47a2c0] gateway.route -> auth-service (34 ms)\n[req_9d47a2c0] rate.check ok" },
      { id: "cp2", name: "auth-service", type: "Servicio", status: "warning", line: 140, snippetStart: 138, snippet: "[req_9d47a2c0] login.success user=admin@ionix.cl\n[req_9d47a2c0] login.success user=admin@ionix.cl\n# 6 intentos fallidos previos no aparecen en el trail" },
    ],
  },
  lf_05: { traceId: "req_c41d77b0", components: logSystems[2].components },
  lf_06: { traceId: "evt_5d2c8b6e", components: logSystems[4].components },
  lf_07: {
    traceId: "cfg_7742a1",
    components: [
      { id: "cp1", name: "audit-worker", type: "Worker", status: "warning", line: 33, snippetStart: 31, snippet: "logrotate.conf:\n/var/log/audit/*.log {\n  # rotate 0   -> rotación desactivada\n}" },
      { id: "cp2", name: "S3 Audit Store", type: "Almacenamiento", status: "ok", line: 40, snippetStart: 38, snippet: "[cfg_7742a1] archive.policy retention=0d\n[cfg_7742a1] archive.check no-copy\n[cfg_7742a1] warn: sin retención en frío" },
    ],
  },
};

export function systemHealth(findings: Finding[]): { key: string; label: string; color: string; dot: string } {
  const active = findings.filter((f) => f.status === "open" || f.status === "acknowledged");
  if (active.some((f) => f.severity === ("critical" as Severity))) return { key: "critical", label: "CRÍTICO", color: "#FF7A76", dot: "#FF5C5C" };
  if (active.some((f) => f.severity === ("high" as Severity))) return { key: "degraded", label: "DEGRADADO", color: "#FF8B4D", dot: "#FF6B1A" };
  if (active.some((f) => f.severity === ("medium" as Severity))) return { key: "warning", label: "ATENCIÓN", color: "#E8C77A", dot: "#E8C77A" };
  return { key: "ok", label: "OPERATIVO", color: "#79BE96", dot: "#79BE96" };
}
