import type { Severity, Status } from "./api/client";

export const SEV_META: Record<
  Severity,
  { label: string; color: string; num: string; bg: string; dot: string; tile: string; rank: number }
> = {
  critical: { label: "CRÍTICA", color: "#FF8A85", num: "#FF7A76", bg: "rgba(255,92,92,0.14)", dot: "#FF5C5C", tile: "CRÍTICOS", rank: 3 },
  high: { label: "ALTA", color: "#FF9B61", num: "#FF8B4D", bg: "rgba(255,107,26,0.14)", dot: "#FF6B1A", tile: "ALTOS", rank: 2 },
  medium: { label: "MEDIA", color: "#E8C77A", num: "#E8C77A", bg: "rgba(232,199,122,0.14)", dot: "#E8C77A", tile: "MEDIOS", rank: 1 },
  low: { label: "BAJA", color: "#B7C2CB", num: "#B7C2CB", bg: "rgba(183,194,203,0.14)", dot: "#B7C2CB", tile: "BAJOS", rank: 0 },
};

export const STATUS_META: Record<Status, { label: string; color: string }> = {
  open: { label: "Abierto", color: "#FF8B4D" },
  acknowledged: { label: "Reconocido", color: "#E8C77A" },
  resolved: { label: "Resuelto", color: "#79BE96" },
  false_positive: { label: "Falso positivo", color: "rgba(245,241,237,0.40)" },
};

export const RISK_ARC = 251.33;

export function riskLevel(riskScore: number): { color: string; bg: string; label: string } {
  if (riskScore === 0) return { color: "#79BE96", bg: "rgba(121,190,150,0.14)", label: "SIN RIESGO" };
  if (riskScore < 10) return { color: "#E8C77A", bg: "rgba(232,199,122,0.14)", label: "RIESGO MODERADO" };
  return { color: "#FF7A76", bg: "rgba(255,92,92,0.14)", label: "RIESGO ALTO" };
}

export function computeRiskScore(counts: Record<Severity, number>): number {
  return 10 * counts.critical + 5 * counts.high + 2 * counts.medium + 1 * counts.low;
}

export function countBySeverity(findings: { severity: Severity }[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  findings.forEach((f) => counts[f.severity]++);
  return counts;
}

export const SCAN_PHASES: Array<[number, string]> = [
  [0, "Clonando repositorio…"],
  [25, "Analizando código fuente (247 archivos)…"],
  [55, "Analizando logs de aplicación…"],
  [72, "Mapeando hallazgos a requisitos PCI-DSS…"],
  [86, "Generando explicaciones y remediaciones con Claude…"],
];
