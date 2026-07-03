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

// T-SOLVE (botón "Generar solución" en el detalle de un hallazgo) — a
// diferencia de buildEnrichmentPrompt (que pide una descripción en texto de
// cómo corregir), este prompt le pide a Claude el CÓDIGO corregido en sí,
// actuando como un ingeniero de software senior que ya tiene el diagnóstico
// resuelto (la explicación de por qué es una violación, generada antes por
// el propio Motor de Razonamiento) y solo necesita escribir el fix.
export type SolutionPromptFinding = Pick<
  CreateFindingInput,
  "ruleId" | "pciRequirement" | "title" | "severity" | "filePath" | "lineNumber" | "snippet"
> & {
  // Explicación ya generada (finding.explanation) — el "Por qué es una
  // violación" que ya ve el usuario en el detalle. Se la pasamos a Claude
  // para que no tenga que re-derivarla y pueda enfocarse en el fix.
  explanation: string;
};

export function buildSolutionPrompt(finding: SolutionPromptFinding): string {
  return `Sos un ingeniero de software senior especialista en seguridad de aplicaciones de pagos y en PCI-DSS v4, trabajando dentro de IONIX Sentinel.

Un motor de reglas determinístico ya detectó una violación real de PCI-DSS en el siguiente código, y el Motor de Razonamiento ya generó el diagnóstico de por qué es una violación (abajo). Esas dos decisiones ya están tomadas — no las cuestiones ni las repitas. Tu única tarea es escribir el CÓDIGO corregido, como lo harías en un pull request real.

Hallazgo:
- ID de regla: ${finding.ruleId}
- Requisito PCI-DSS v4: ${finding.pciRequirement}
- Título: ${finding.title}
- Severidad: ${finding.severity}
- Archivo: ${finding.filePath}${finding.lineNumber != null ? `:${finding.lineNumber}` : ""}

Por qué es una violación (ya generado, tomalo como diagnóstico dado):
${finding.explanation}

Código con la vulnerabilidad:
\`\`\`
${finding.snippet}
\`\`\`

Generá una respuesta que contenga EXCLUSIVAMENTE un bloque JSON (podés incluir texto antes o después si querés, pero el JSON tiene que estar completo y ser válido) con esta forma exacta:

{
  "codeBefore": "<el fragmento de código original relevante — puede ser el mismo snippet o solo la porción exacta que cambia>",
  "codeAfter": "<el código YA CORREGIDO, listo para reemplazar codeBefore — código real y funcional en el mismo lenguaje/framework del snippet, no pseudocódigo>",
  "explanation": "<1-3 oraciones en español explicando POR QUÉ este cambio puntual resuelve la violación — no repitas el diagnóstico de arriba, enfocate en el fix>"
}

Reglas para tu respuesta:
- "codeAfter" tiene que ser código real que compile/corra en el mismo lenguaje y con las mismas convenciones del snippet original (mismo estilo de imports, nombres de variables existentes, etc.) — no inventes funciones o librerías que no existan en un proyecto Node/TypeScript/SQL típico salvo que sea evidente que ya se usan.
- Si el fix requiere una migración de base de datos (ALTER TABLE, etc.) o un paso fuera del snippet (ej. usar un KMS, rotar una clave), mencionalo brevemente en "explanation", pero "codeAfter" debe mostrar igual el cambio de código que sí es posible mostrar en el snippet.
- No agregues comentarios explicando línea por línea dentro de "codeAfter" — el código debe quedar limpio, como si ya estuviera mergeado.
- "explanation" va en español, dirigida a un desarrollador que ya leyó el diagnóstico y solo quiere entender el fix.`;
}
