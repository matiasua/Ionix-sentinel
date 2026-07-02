export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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

export async function getHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error("Backend health check failed");
  return res.json();
}

export async function getFindings(): Promise<Finding[]> {
  const res = await fetch(`${API_URL}/api/findings`);
  if (!res.ok) throw new Error("Failed to fetch findings");
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
