export type Severity = "low" | "medium" | "high" | "critical";
export type Source = "code" | "log";
export type Status = "open" | "acknowledged" | "resolved" | "false_positive";
export type ReasoningStatus = "ok" | "error";

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
  reasoningStatus: ReasoningStatus;
  createdAt: string;
}

// Finding crudo: lo que produce el analizador antes de pasar por el motor
// de razonamiento (sin explanation/remediation/reasoningStatus todavía).
export interface CreateFindingInput {
  ruleId: string;
  pciRequirement: string;
  title: string;
  severity: Severity;
  source: Source;
  filePath: string;
  lineNumber: number | null;
  snippet: string;
  explanation?: string;
  remediation?: string;
  status?: Status;
  scanId?: string | null;
}
