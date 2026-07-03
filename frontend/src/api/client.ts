export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type Severity = "low" | "medium" | "high" | "critical";
export type Source = "code" | "log";
export type Status = "open" | "acknowledged" | "resolved" | "false_positive";

export type CodeSolutionStatus = "ok" | "error";

// Solución de código generada on-demand (botón "Generar solución" en el
// detalle) — distinta de `remediation` (texto generado en bulk durante el
// scan). Acá Claude devuelve el código corregido en sí, no una descripción.
export interface CodeSolution {
  codeBefore: string;
  codeAfter: string;
  explanation: string;
  generatedAt: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  pciRequirement: string;
  title: string;
  severity: Severity;
  source: Source;
  filePath: string;
  lineNumber: number | null;
  snippet: string;
  explanation: string;
  remediation: string;
  status: Status;
  scanId: string | null;
  // Opcionales: los findings reales (backend) siempre las traen; los mocks
  // de desarrollo (mocks/findings.ts, mocks/logs.ts) no las necesitan.
  codeSolution?: CodeSolution | null;
  codeSolutionStatus?: CodeSolutionStatus | null;
  createdAt: string;
}

export interface CreateFindingInput {
  ruleId: string;
  pciRequirement: string;
  title: string;
  severity: Severity;
  source: Source;
  filePath: string;
  lineNumber: number | null;
  snippet: string;
}

export interface FindingFilters {
  severity?: Severity;
  source?: Source;
  status?: Status;
  scanId?: string;
}

export interface ScanSummary {
  scanId: string | null;
  branch?: string;
  findingsCount: number;
  riskScore: number;
  severityCounts: Partial<Record<Severity, number>>;
}

export interface LogSystemView {
  id: string;
  name: string;
  role: string;
  logFile: string;
  findingIds: string[];
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

// Salida del análisis de logs del sistema productivo simulado (GET /api/logs).
export interface LiveLogPayload {
  system: string;
  logFile: string;
  generatedAt: string;
  lineCount: number;
  findings: Finding[];
  systems: LogSystemView[];
  traces: Record<string, { traceId: string; components: TraceComponent[] }>;
}

export async function getHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error("Backend health check failed");
  return res.json();
}

export async function getFindings(filters: FindingFilters = {}): Promise<Finding[]> {
  const params = new URLSearchParams();
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.source) params.set("source", filters.source);
  if (filters.status) params.set("status", filters.status);
  if (filters.scanId) params.set("scanId", filters.scanId);

  const query = params.toString();
  const res = await fetch(`${API_URL}/api/findings${query ? `?${query}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch findings");
  return res.json();
}

export async function getFinding(id: string): Promise<Finding> {
  const res = await fetch(`${API_URL}/api/findings/${id}`);
  if (!res.ok) throw new Error("Failed to fetch finding");
  return res.json();
}

export async function createFinding(input: CreateFindingInput): Promise<Finding> {
  const res = await fetch(`${API_URL}/api/findings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create finding");
  return res.json();
}

export async function updateFindingStatus(id: string, status: Status): Promise<Finding> {
  const res = await fetch(`${API_URL}/api/findings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update finding");
  return res.json();
}

// `gitBranch` solo aplica cuando branch === "live-scan": es el nombre de una
// rama GIT REAL de matiasua/Ionix-sentinel (no una de las ramas-etiqueta del
// selector de arriba) que el backend clona/actualiza sola antes de escanear.
// Para el resto de las ramas (seeds) se omite y el backend usa su catálogo fijo.
export async function triggerScan(branch: string, gitBranch?: string): Promise<ScanSummary> {
  const res = await fetch(`${API_URL}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(gitBranch ? { branch, gitBranch } : { branch }),
  });
  if (!res.ok) throw new Error("Failed to trigger scan");
  return res.json();
}

// Ramas reales del repo matiasua/Ionix-sentinel, para poblar el selector
// secundario que aparece cuando se elige "live-scan (análisis real)".
export async function getLiveScanBranches(): Promise<string[]> {
  const res = await fetch(`${API_URL}/api/live-scan/branches`);
  if (!res.ok) throw new Error("Failed to fetch live-scan branches");
  const data = await res.json();
  return data.branches;
}

export async function getLogs(): Promise<LiveLogPayload> {
  const res = await fetch(`${API_URL}/api/logs`);
  if (!res.ok) throw new Error("Failed to fetch logs");
  return res.json();
}

export async function getLatestScan(): Promise<ScanSummary> {
  const res = await fetch(`${API_URL}/api/scans/latest`);
  if (!res.ok) throw new Error("Failed to fetch latest scan");
  return res.json();
}

// Botón "Generar solución" en el detalle de un hallazgo (solo aplica a
// findings de código — los de logs no tienen fila en `findings`, ver
// App.tsx). Genera y persiste la solución en el backend; devuelve el
// finding actualizado completo.
export async function generateCodeSolution(id: string): Promise<Finding> {
  const res = await fetch(`${API_URL}/api/findings/${id}/solve`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to generate code solution");
  return res.json();
}

// Misma idea para findings de logs, que no tienen fila en `findings` (se
// generan al vuelo en GET /api/logs) — mandamos los datos del finding en el
// body en vez de un id, y el backend no persiste nada. El frontend mergea
// el resultado en su estado local de logs (App.tsx), igual que ya hace con
// el cambio de status para findings de logs.
export async function generateLogCodeSolution(
  finding: Pick<Finding, "ruleId" | "pciRequirement" | "title" | "severity" | "filePath" | "lineNumber" | "snippet" | "explanation">
): Promise<{ codeSolution: CodeSolution; codeSolutionStatus: CodeSolutionStatus }> {
  const res = await fetch(`${API_URL}/api/logs/solve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(finding),
  });
  if (!res.ok) throw new Error("Failed to generate code solution");
  return res.json();
}
