import { Severity } from "../types/finding";

// Orden de severidad de mayor a menor riesgo — usado para ORDER BY y para
// inicializar conteos agregados.
export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

// Pesos de la fórmula de risk score (docs/07-backend-spec.docs.md §5):
// riskScore = 10*critical + 5*high + 2*medium + 1*low
export const RISK_WEIGHTS: Record<Severity, number> = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 1,
};

// Fragmento SQL para ordenar filas por severidad desc en un ORDER BY.
export const SEVERITY_ORDER_SQL = `CASE severity
  WHEN 'critical' THEN 0
  WHEN 'high' THEN 1
  WHEN 'medium' THEN 2
  WHEN 'low' THEN 3
  ELSE 4
END`;

export function emptySeverityCounts(): Record<Severity, number> {
  return { critical: 0, high: 0, medium: 0, low: 0 };
}

export function computeRiskScore(counts: Record<Severity, number>): number {
  return SEVERITY_ORDER.reduce(
    (score, severity) => score + RISK_WEIGHTS[severity] * (counts[severity] ?? 0),
    0
  );
}
