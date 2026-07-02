import { pool } from "../db/pool";
import { Severity } from "../types/finding";
import { computeRiskScore, emptySeverityCounts } from "../lib/severity";
import { SCAN_FIXTURES } from "./fixtures";

export interface ScanResult {
  scanId: string;
  findingsCount: number;
  riskScore: number;
  severityCounts: Record<Severity, number>;
}

// STUB: siembra los findings de `fixtures.ts` bajo un scanId nuevo. Reemplazar
// el cuerpo de esta función por la invocación real del Analizador Estático
// (semgrep + rules/ + reasoning/) no cambia el contrato de `POST /api/scan`.
export async function runScan(): Promise<ScanResult> {
  const scanId = `scan_${Date.now()}`;

  for (const finding of SCAN_FIXTURES) {
    await pool.query(
      `INSERT INTO findings
         (rule_id, pci_requirement, title, severity, source, file_path, line_number, snippet, explanation, remediation, status, scan_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        finding.ruleId,
        finding.pciRequirement,
        finding.title,
        finding.severity,
        finding.source,
        finding.filePath,
        finding.lineNumber,
        finding.snippet,
        finding.explanation ?? null,
        finding.remediation ?? null,
        finding.status ?? "open",
        scanId,
      ]
    );
  }

  const summary = await getScanSummary(scanId);
  if (!summary) {
    throw new Error("Failed to compute summary for freshly created scan");
  }
  return summary;
}

export async function getScanSummary(scanId: string): Promise<ScanResult | null> {
  const result = await pool.query(
    "SELECT severity, COUNT(*)::int AS count FROM findings WHERE scan_id = $1 GROUP BY severity",
    [scanId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const severityCounts = emptySeverityCounts();
  let findingsCount = 0;
  for (const row of result.rows) {
    severityCounts[row.severity as Severity] = row.count;
    findingsCount += row.count;
  }

  return {
    scanId,
    findingsCount,
    riskScore: computeRiskScore(severityCounts),
    severityCounts,
  };
}

export async function getLatestScanId(): Promise<string | null> {
  const result = await pool.query(
    "SELECT scan_id FROM findings WHERE scan_id IS NOT NULL ORDER BY created_at DESC LIMIT 1"
  );
  return result.rows[0]?.scan_id ?? null;
}
