// T2.1 (HU-B2.1) — Cliente del Motor de Razonamiento. Envuelve la llamada a
// la Claude API para enriquecer un finding crudo (salida del Analizador
// Estático, Épica B1) con explicación y remediación en español.
//
// Regla dura del proyecto: Claude nunca decide si algo es una violación —
// esa decisión ya la tomó el motor de reglas (rules/pci-rules.yaml). Acá
// solo se enriquece. Por eso `enrichFinding` NUNCA lanza: si la llamada a la
// API falla, o la respuesta no parsea/valida (reasoning/parse.ts), se
// devuelve un resultado con `reasoningStatus: "error"` y valores de
// respaldo tomados del propio finding crudo, para que scan/service.ts pueda
// insertarlo igual sin romper el escaneo completo (HU-B2.2 / HU-B2.3).
import Anthropic from "@anthropic-ai/sdk";
import type { CreateFindingInput, Severity } from "../types/finding";
import { buildEnrichmentPrompt } from "./prompt";
import { parseEnrichmentResponse } from "./parse";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
const MAX_TOKENS = 1024;

export interface EnrichmentOutcome {
  pciRequirement: string;
  severity: Severity;
  explanation: string;
  remediation: string;
  reasoningStatus: "ok" | "error";
}

// Cliente lazy: si ANTHROPIC_API_KEY no está configurada, el error solo
// explota cuando de verdad se intenta enriquecer un finding (no al importar
// este módulo) — así el resto del backend puede levantar sin la key
// configurada, por ejemplo mientras se prueba T5.x sin Motor de Razonamiento.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY no está configurada (ver docs/07-backend-spec.docs.md §7)"
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function enrichFinding(raw: CreateFindingInput): Promise<EnrichmentOutcome> {
  try {
    const prompt = buildEnrichmentPrompt(raw);
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    if (!textBlock) {
      throw new Error("La respuesta de Claude no incluyó ningún bloque de texto");
    }

    const enrichment = parseEnrichmentResponse(textBlock.text);
    return { ...enrichment, reasoningStatus: "ok" };
  } catch (error) {
    return buildFallback(raw, error);
  }
}

function buildFallback(raw: CreateFindingInput, error: unknown): EnrichmentOutcome {
  const reason = error instanceof Error ? error.message : String(error);
  // No usamos el logger de la app (no hay uno compartido todavía) — un
  // console.error identificable alcanza para diagnosticar en la demo sin
  // que un fallo de Claude tumbe el request de POST /api/scan.
  console.error(
    `[reasoning] enrichFinding falló para ${raw.ruleId} @ ${raw.filePath}:${raw.lineNumber ?? "?"} — ${reason}`
  );

  return {
    pciRequirement: raw.pciRequirement,
    severity: raw.severity,
    explanation:
      "El Motor de Razonamiento no pudo generar una explicación automática para este hallazgo. La severidad y el requisito PCI-DSS mostrados son los que asignó el motor de reglas, sin enriquecer.",
    remediation:
      "Revisar manualmente este hallazgo — el enriquecimiento automático con Claude falló para este caso.",
    reasoningStatus: "error",
  };
}
