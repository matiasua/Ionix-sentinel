// T2.3 (HU-B2.2 / HU-B2.3) — Parseo defensivo + validación de schema de la
// respuesta de Claude. Nunca asume que el string completo es JSON (Claude
// puede agregar prosa antes/después, o envolver el JSON en un bloque
// ```json ... ```). Si el parseo o la validación fallan, lanza un Error
// descriptivo — es responsabilidad de quien llama (reasoning/client.ts)
// capturarlo y convertirlo en reasoningStatus: "error" sin romper el
// pipeline completo (regla dura del proyecto).
import type { Severity } from "../types/finding";

export interface EnrichmentResult {
  pciRequirement: string;
  severity: Severity;
  explanation: string;
  remediation: string;
}

const VALID_SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

// Extrae el primer bloque `{ ... }` balanceado del texto (no solo "primera
// '{' a última '}'", que se rompe si Claude agrega, por ejemplo, un segundo
// ejemplo de JSON después del real). Ignora llaves dentro de strings para no
// cortar mal si algún valor incluye "{" o "}" como texto.
export function extractJsonBlock(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) {
    throw new Error("La respuesta de Claude no contiene ningún bloque JSON (no se encontró '{')");
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === "\\" && inString) {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  throw new Error("La respuesta de Claude tiene un bloque JSON sin cerrar (llaves desbalanceadas)");
}

export function parseEnrichmentResponse(text: string): EnrichmentResult {
  const jsonBlock = extractJsonBlock(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonBlock);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`El bloque JSON extraído de la respuesta de Claude no es JSON válido: ${reason}`);
  }

  return validateEnrichmentSchema(parsed);
}

function validateEnrichmentSchema(value: unknown): EnrichmentResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("La respuesta de Claude no es un objeto JSON");
  }

  const candidate = value as Record<string, unknown>;
  const missing = ["pciRequirement", "severity", "explanation", "remediation"].filter(
    (key) => typeof candidate[key] !== "string" || (candidate[key] as string).trim() === ""
  );
  if (missing.length > 0) {
    throw new Error(
      `La respuesta de Claude no tiene los campos requeridos (o vienen vacíos): ${missing.join(", ")}`
    );
  }

  const severity = (candidate.severity as string).trim().toLowerCase();
  if (!VALID_SEVERITIES.includes(severity as Severity)) {
    throw new Error(
      `severity inválida en la respuesta de Claude: "${candidate.severity}" (debe ser una de ${VALID_SEVERITIES.join(", ")})`
    );
  }

  return {
    pciRequirement: (candidate.pciRequirement as string).trim(),
    severity: severity as Severity,
    explanation: (candidate.explanation as string).trim(),
    remediation: (candidate.remediation as string).trim(),
  };
}
