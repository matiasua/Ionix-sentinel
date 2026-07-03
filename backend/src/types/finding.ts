export type Severity = "low" | "medium" | "high" | "critical";
export type Source = "code" | "log";
export type Status = "open" | "acknowledged" | "resolved" | "false_positive";
export type ReasoningStatus = "ok" | "error";
export type Category = "codigo" | "libreria" | "pci_compliance";
export type CodeSolutionStatus = "ok" | "error";

// Solución de código generada on-demand (botón "Generar solución" en el
// detalle de un hallazgo) — distinto de `remediation`, que es un párrafo de
// texto generado en bulk durante el scan. Acá el Motor de Razonamiento actúa
// como un ingeniero de software: lee el snippet + la explicación ya generada
// y devuelve el código corregido, no solo una descripción de qué hacer.
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
  reasoningStatus: ReasoningStatus;
  category: Category | null;
  branch: string | null;
  codeSolution: CodeSolution | null;
  codeSolutionStatus: CodeSolutionStatus | null;
  createdAt: string;
}

// Una línea del archivo de logs generado (JSON-lines). Mismo formato que el
// fixture logs/production-sample.log del repo demo.
export interface LogLine {
  timestamp: string;
  level: "info" | "warn" | "error";
  service: string;
  route: string;
  message: string;
  requestId: string;
  sourceIp?: string;
  errorCode?: string;
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

export interface UpdateFindingInput {
  status: Status;
}

export interface FindingFilters {
  severity?: Severity;
  source?: Source;
  status?: Status;
  scanId?: string;
}
