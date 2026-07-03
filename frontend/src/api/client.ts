export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type Severity = "low" | "medium" | "high" | "critical";
export type Source = "code" | "log";
export type Status = "open" | "acknowledged" | "resolved" | "false_positive";

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

export async function triggerScan(branch: string): Promise<ScanSummary> {
  const res = await fetch(`${API_URL}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branch }),
  });
  if (!res.ok) throw new Error("Failed to trigger scan");
  return res.json();
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
