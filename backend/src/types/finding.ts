export type Severity = "low" | "medium" | "high" | "critical";
export type Source = "code" | "log";

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  pciRequirement: string;
  source: Source;
  createdAt: string;
}

export interface CreateFindingInput {
  title: string;
  description: string;
  severity: Severity;
  pciRequirement: string;
  source: Source;
}
