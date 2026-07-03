import path from "node:path";
import { pool } from "../db/pool";
import { Severity } from "../types/finding";
import { computeRiskScore, emptySeverityCounts } from "../lib/severity";
import { loadRules } from "../rules/loader";
import { runAnalysis } from "../analysis/runner";
import { mapMatchesToFindings } from "../analysis/mapper";
import { enrichFinding } from "../reasoning/client";
import type { Rule } from "../types/rule";

export interface ScanResult {
  scanId: string;
  findingsCount: number;
  riskScore: number;
  severityCounts: Record<Severity, number>;
}

const RULES_PATH = path.join(__dirname, "../rules/pci-rules.yaml");
// Nota: esto resuelve bien con `npm run dev` (tsx, __dirname = src/scan) y
// con docker-compose (mismo layout dentro del contenedor). Si en algún
// momento se corre `npm run build && npm start`, agregar un paso que copie
// src/rules/*.yaml a dist/rules/ — tsc no copia archivos no-TS.

// El YAML de reglas es chico y no cambia mientras el proceso vive — se carga
// una vez y se reusa en cada scan en vez de leer+parsear el archivo en cada
// request. Si en algún momento hace falta recargar reglas sin reiniciar el
// backend (ej. para iterar sobre pci-rules.yaml en vivo durante la demo),
// basta con resetear este cache.
let cachedRules: Rule[] | null = null;
function getRules(): Rule[] {
  if (!cachedRules) {
    cachedRules = loadRules(RULES_PATH);
  }
  return cachedRules;
}

// T5.1 completo — Pipeline real de punta a punta: Analizador Estático
// (T1.1-T1.5) + Motor de Razonamiento (T2.1-T2.3), reemplaza el stub que
// sembraba SCAN_FIXTURES (ver scan/fixtures.ts, que queda sin uso pero no se
// borra: documenta el shape esperado). `targetPath` es la carpeta de código
// a escanear — en la demo, el checkout de pci-dss-vulnerable-demo (rama
// pci-vulnerable-demo).
export async function runScan(targetPath: string): Promise<ScanResult> {
  const rules = getRules();
  const matches = runAnalysis(targetPath, rules);
  const rawFindings = mapMatchesToFindings(matches, rules);

  // enrichFinding() nunca lanza (ver reasoning/client.ts): si Claude falla
  // para un finding puntual, ese finding se guarda igual con
  // reasoningStatus: "error" en vez de tumbar el scan completo. Se corren en
  // paralelo — para el tamaño de repo de la demo (10-25 findings) no vale la
  // pena pagar el costo de llamadas secuenciales a la API. Si en algún
  // momento el repo escaneado crece mucho, acá es donde limitar cuántos
  // findings se enriquecen en vivo (ver "T5.3" en docs/wbs.md).
  const findings = await Promise.all(
    rawFindings.map(async (finding) => {
      const enrichment = await enrichFinding(finding);
      return { ...finding, ...enrichment };
    })
  );

  const scanId = `scan_${Date.now()}`;

  for (const finding of findings) {
    await pool.query(
      `INSERT INTO findings
         (rule_id, pci_requirement, title, severity, source, file_path, line_number, snippet, explanation, remediation, status, scan_id, reasoning_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        finding.ruleId,
        finding.pciRequirement,
        finding.title,
        finding.severity,
        finding.source,
        finding.filePath,
        finding.lineNumber,
        finding.snippet,
        finding.explanation,
        finding.remediation,
        finding.status ?? "open",
        scanId,
        finding.reasoningStatus,
      ]
    );
  }

  const summary = await getScanSummary(scanId);
  if (!summary) {
    // 0 findings es un resultado válido (repo limpio, o el target apuntaba a
    // una carpeta sin nada que matchee) — no es un error de cómputo, así que
    // no lo tratamos como excepción como hacía el stub original.
    return {
      scanId,
      findingsCount: 0,
      riskScore: 0,
      severityCounts: emptySeverityCounts(),
    };
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
