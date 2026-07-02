import { Severity, Status } from "../api/client";

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export const STATUS_LABELS: Record<Status, string> = {
  open: "Abierto",
  acknowledged: "Reconocido",
  resolved: "Resuelto",
  false_positive: "Falso positivo",
};

export type RiskLevel = "none" | "warning" | "critical";

// Umbral simple (no ML): 0 = verde, 1-9 = amarillo, 10+ = rojo.
export function riskLevel(score: number): RiskLevel {
  if (score <= 0) return "none";
  if (score < 10) return "warning";
  return "critical";
}
