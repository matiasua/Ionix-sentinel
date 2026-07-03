import { pool } from "../db/pool";
import { Severity } from "../types/finding";
import { computeRiskScore, emptySeverityCounts } from "../lib/severity";
import { BranchKey, BRANCH_FINDINGS } from "./seeds";
import { generateBranchLog } from "./logfile";

export interface ScanResult {
  scanId: string;
  branch: BranchKey;
  findingsCount: number;
  riskScore: number;
  severityCounts: Record<Severity, number>;
}

// "Analizar repositorio" para la rama seleccionada en el dropdown.
//
// Es idempotente por diseño: DELETE de TODOS los findings + INSERT del subconjunto
// de la rama. Repetir el análisis sobre la misma (o cambiar de) rama nunca duplica
// ni mezcla filas — la tabla siempre queda con exactamente los hallazgos de la
// última rama analizada. También genera generated-logs/<branch>.log para que el
// Dashboard de logs quede consistente con el Dashboard estático.
//
// STUB honesto: los hallazgos vienen de un catálogo semilla (scan/seeds.ts), no de
// un analizador estático real (semgrep + reglas + Claude). Reemplazar el cuerpo por
// el pipeline real no cambia el contrato de `POST /api/scan`.
export async function runScan(branch: BranchKey): Promise<ScanResult> {
  const scanId = `scan_${branch}_${Date.now()}`;
  const seeds = BRANCH_FINDINGS[branch];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Borra el estado anterior (de cualquier rama) antes de sembrar el nuevo.
    await client.query("DELETE FROM findings");

    for (const s of seeds) {
      await client.query(
        `INSERT INTO findings
           (rule_id, pci_requirement, title, severity, source, file_path, line_number,
            snippet, explanation, remediation, status, scan_id, category, branch)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          s.ruleId,
          s.pciRequirement,
          s.title,
          s.severity,
          s.source,
          s.filePath,
          s.lineNumber,
          s.snippet,
          s.explanation,
          s.remediation,
          "open",
          scanId,
          s.category,
          branch,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // Genera el archivo de logs de la rama (artefacto + fuente del Dashboard de logs).
  generateBranchLog(branch, scanId);

  const severityCounts = emptySeverityCounts();
  for (const s of seeds) severityCounts[s.severity]++;

  return {
    scanId,
    branch,
    findingsCount: seeds.length,
    riskScore: computeRiskScore(severityCounts),
    severityCounts,
  };
}

export async function getScanSummary(scanId: string): Promise<Omit<ScanResult, "branch"> | null> {
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
