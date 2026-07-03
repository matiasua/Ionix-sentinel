import path from "node:path";
import { pool } from "../db/pool";
import { Category, CreateFindingInput, Severity } from "../types/finding";
import { computeRiskScore, emptySeverityCounts } from "../lib/severity";
import { BranchKey, BRANCH_FINDINGS } from "./seeds";
import { generateBranchLog } from "./logfile";
import { env } from "../config/env";
import { loadRules } from "../rules/loader";
import { runAnalysis } from "../analysis/runner";
import { mapMatchesToFindings } from "../analysis/mapper";
import { enrichFinding } from "../reasoning/client";
import type { Rule } from "../types/rule";

export interface ScanResult {
  scanId: string;
  branch: BranchKey;
  findingsCount: number;
  riskScore: number;
  severityCounts: Record<Severity, number>;
}

// Forma común que le llega al INSERT sin importar de dónde salió el finding
// (catálogo semilla o pipeline real) — evita duplicar el bloque de INSERT.
interface InsertableFinding {
  ruleId: string;
  pciRequirement: string;
  title: string;
  severity: Severity;
  source: CreateFindingInput["source"];
  filePath: string;
  lineNumber: number | null;
  snippet: string;
  explanation: string;
  remediation: string;
  category: Category;
}

const RULES_PATH = path.join(__dirname, "../rules/pci-rules.yaml");
// Resuelve bien con `npm run dev` (tsx, __dirname = src/scan) y con
// docker-compose (mismo layout dentro del contenedor). Si en algún momento
// se corre `npm run build && npm start`, agregar un paso que copie
// src/rules/*.yaml a dist/rules/ — tsc no copia archivos no-TS.

let cachedRules: Rule[] | null = null;
function getRules(): Rule[] {
  if (!cachedRules) {
    cachedRules = loadRules(RULES_PATH);
  }
  return cachedRules;
}

// Clasificación liviana para la columna `category` del selector de ramas
// (mismo criterio que scan/seeds.ts: bugs de implementación = "codigo",
// patrones de configuración/manejo de datos = "pci_compliance"). Ninguna de
// las 7 reglas de hoy corresponde a una dependencia de terceros, por eso no
// hay ningún caso "libreria" acá.
const RULE_CATEGORY: Record<string, Category> = {
  "PCI-SECRET-HARDCODED": "codigo",
  "PCI-PAN-CVV-LOGGED": "codigo",
  "PCI-SQL-INJECTION": "codigo",
  "PCI-WEAK-CRYPTO": "codigo",
  "PCI-INSECURE-STORAGE-CLIENT": "codigo",
  "PCI-NO-TLS": "pci_compliance",
  "PCI-PAN-LITERAL": "pci_compliance",
};

// Rama especial "live-scan" (no vive en scan/seeds.ts): en vez de sembrar un
// catálogo fijo, corre el pipeline real de punta a punta — Analizador
// Estático (T1.1-T1.5) + Motor de Razonamiento (T2.1-T2.3) — contra
// env.scanTargetPath (normalmente el checkout de pci-dss-vulnerable-demo).
// Pensada como modo "bonus"/fallback: si algo falla acá (Postgres, la API de
// Claude, la ruta configurada), el resto del selector de ramas (seeds) sigue
// funcionando sin depender de infraestructura externa — por eso vive aparte
// y no reemplaza el modo seed.
async function runLiveScan(): Promise<InsertableFinding[]> {
  if (!env.scanTargetPath) {
    throw new Error(
      "SCAN_TARGET_PATH no está configurada — no hay qué escanear para la rama live-scan."
    );
  }

  const rules = getRules();
  const matches = runAnalysis(env.scanTargetPath, rules);
  const rawFindings = mapMatchesToFindings(matches, rules);

  // enrichFinding() nunca lanza (ver reasoning/client.ts): si Claude falla
  // para un finding puntual, ese finding se guarda igual con
  // reasoningStatus: "error" (el resultado va a `explanation`/`remediation`
  // de respaldo) en vez de tumbar el scan completo.
  const enriched = await Promise.all(
    rawFindings.map(async (finding) => {
      const enrichment = await enrichFinding(finding);
      return { ...finding, ...enrichment };
    })
  );

  return enriched.map((finding) => ({
    ruleId: finding.ruleId,
    pciRequirement: finding.pciRequirement,
    title: finding.title,
    severity: finding.severity,
    source: finding.source,
    filePath: finding.filePath,
    lineNumber: finding.lineNumber,
    snippet: finding.snippet,
    explanation: finding.explanation,
    remediation: finding.remediation,
    category: RULE_CATEGORY[finding.ruleId] ?? "pci_compliance",
  }));
}

function seedFindingsFor(branch: BranchKey): InsertableFinding[] {
  return BRANCH_FINDINGS[branch].map((s) => ({
    ruleId: s.ruleId,
    pciRequirement: s.pciRequirement,
    title: s.title,
    severity: s.severity,
    source: s.source,
    filePath: s.filePath,
    lineNumber: s.lineNumber,
    snippet: s.snippet,
    explanation: s.explanation,
    remediation: s.remediation,
    category: s.category,
  }));
}

// "Analizar repositorio" para la rama seleccionada en el dropdown.
//
// Es idempotente por diseño: DELETE de TODOS los findings + INSERT del nuevo
// resultado. Repetir el análisis sobre la misma (o cambiar de) rama nunca
// duplica ni mezcla filas — la tabla siempre queda con exactamente los
// hallazgos de la última rama analizada. También genera
// generated-logs/<branch>.log para que el Dashboard de logs quede
// consistente con el Dashboard estático (para "live-scan" el log queda solo
// con las líneas benignas — no hay una manifestación de log seedeada para
// hallazgos que no se conocen de antemano).
export async function runScan(branch: BranchKey): Promise<ScanResult> {
  const findings = branch === "live-scan" ? await runLiveScan() : seedFindingsFor(branch);
  const scanId = `scan_${branch}_${Date.now()}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Borra el estado anterior (de cualquier rama) antes de sembrar el nuevo.
    await client.query("DELETE FROM findings");

    for (const f of findings) {
      await client.query(
        `INSERT INTO findings
           (rule_id, pci_requirement, title, severity, source, file_path, line_number,
            snippet, explanation, remediation, status, scan_id, category, branch)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          f.ruleId,
          f.pciRequirement,
          f.title,
          f.severity,
          f.source,
          f.filePath,
          f.lineNumber,
          f.snippet,
          f.explanation,
          f.remediation,
          "open",
          scanId,
          f.category,
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

  generateBranchLog(branch, scanId);

  const severityCounts = emptySeverityCounts();
  for (const f of findings) severityCounts[f.severity]++;

  return {
    scanId,
    branch,
    findingsCount: findings.length,
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
