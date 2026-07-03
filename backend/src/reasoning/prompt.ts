// T2.2 (HU-B2.1) — Construye el prompt que se le manda a Claude para
// enriquecer un finding crudo. Regla dura del proyecto: el motor de reglas
// (rules/pci-rules.yaml + analysis/) ya decidió que esto ES una violación —
// Claude nunca decide si algo es o no una violación, solo la explica y
// sugiere cómo corregirla. El prompt lo deja explícito para que el modelo no
// "reconsidere" el hallazgo.
import type { CreateFindingInput } from "../types/finding";

// Únicos campos del finding que le importan al prompt — evita que cambios
// futuros en CreateFindingInput (ej. agregar reasoningStatus más adelante)
// rompan esta función por accidente.
export type PromptFinding = Pick<
  CreateFindingInput,
  "ruleId" | "pciRequirement" | "title" | "severity" | "filePath" | "lineNumber" | "snippet"
>;

export function buildEnrichmentPrompt(finding: PromptFinding): string {
  return `Sos parte del Motor de Razonamiento de IONIX Sentinel, un escáner de cumplimiento PCI-DSS v4.

Un motor de reglas determinístico (NO vos) ya analizó código fuente y determinó que la siguiente línea es una violación real de PCI-DSS. Esa decisión ya está tomada y no se puede revertir: tu única tarea es ENRIQUECER este hallazgo, no volver a evaluarlo ni cuestionar si corresponde o no. No agregues comentarios sobre si estás o no de acuerdo con la clasificación.

Hallazgo determinado por el motor de reglas:
- ID de regla: ${finding.ruleId}
- Requisito PCI-DSS v4 asociado (según el motor de reglas): ${finding.pciRequirement}
- Título: ${finding.title}
- Severidad base (según el motor de reglas): ${finding.severity}
- Archivo: ${finding.filePath}${finding.lineNumber != null ? `:${finding.lineNumber}` : ""}

Fragmento de código relevante:
\`\`\`
${finding.snippet}
\`\`\`

Con ese contexto, generá una respuesta que contenga EXCLUSIVAMENTE un bloque JSON (podés incluir texto antes o después si querés, pero el JSON tiene que estar completo y ser válido) con esta forma exacta:

{
  "pciRequirement": "<el requisito PCI-DSS v4 más preciso para este caso puntual, en el mismo formato que el de arriba, ej. \\"8.6.2\\">",
  "severity": "<una de: low | medium | high | critical>",
  "explanation": "<2-4 oraciones en español explicando POR QUÉ este código específico viola el requisito, en términos concretos del snippet, no genéricos>",
  "remediation": "<2-4 oraciones en español con pasos concretos y accionables para corregir este caso específico>"
}

Reglas para tu respuesta:
- "severity" tiene que ser exactamente uno de esos 4 valores, en minúscula, sin comillas adicionales ni variaciones.
- Podés ajustar "severity" y "pciRequirement" respecto de los valores base si el snippet te da contexto para precisarlos (ej. bajar/subir un nivel de severidad, o apuntar a un sub-requisito más específico) — pero nunca los dejes vacíos ni inventes un requisito que no exista en PCI-DSS v4.
- "explanation" y "remediation" van en español, dirigidos a un desarrollador que va a leer esto en un dashboard.
- No repitas el snippet completo dentro de "explanation" ni "remediation".`;
}
