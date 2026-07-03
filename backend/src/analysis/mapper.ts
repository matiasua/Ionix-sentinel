// T1.5 (HU-B1.4) — Normaliza los RawMatch de analysis/runner.ts al esquema
// único de "finding crudo" (CreateFindingInput) que usa el resto del
// pipeline (Motor de Razonamiento, POST /api/findings), sin importar si el
// hallazgo viene de código o, en Fase 2, de logs.
import type { CreateFindingInput } from "../types/finding";
import type { Rule } from "../types/rule";
import type { RawMatch } from "./runner";

/**
 * Convierte un único match crudo en el finding que espera el resto del
 * pipeline. `rule` debe ser la regla que generó `match` (mismo `id`).
 */
export function mapMatchToFinding(match: RawMatch, rule: Rule): CreateFindingInput {
  return {
    ruleId: rule.id,
    pciRequirement: rule.pciRequirement,
    title: rule.title,
    severity: rule.severity,
    source: "code",
    filePath: match.filePath,
    lineNumber: match.lineNumber,
    snippet: match.snippet,
  };
}

/**
 * Convenience para el caso real (scan.routes.ts, T3.2): mapea todos los
 * matches de una corrida de `runAnalysis` contra el mismo array de `rules`
 * que se le pasó al analizador, resolviendo el lookup por `ruleId`.
 */
export function mapMatchesToFindings(matches: RawMatch[], rules: Rule[]): CreateFindingInput[] {
  const rulesById = new Map(rules.map((r) => [r.id, r]));

  return matches.map((match) => {
    const rule = rulesById.get(match.ruleId);
    if (!rule) {
      // No debería pasar si matches viene de runAnalysis(path, rules) con
      // este mismo `rules` — defensivo por si alguien mezcla arrays distintos.
      throw new Error(`mapMatchesToFindings: no se encontró la regla '${match.ruleId}' para el match de ${match.filePath}:${match.lineNumber}`);
    }
    return mapMatchToFinding(match, rule);
  });
}
