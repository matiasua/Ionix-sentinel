// T1.3 (HU-B1.2) — Carga y valida backend/src/rules/pci-rules.yaml.
//
// El motor de reglas determinístico es la única fuente de verdad sobre qué es
// una violación PCI-DSS (regla dura del proyecto). Este loader falla rápido y
// con mensajes claros si el YAML está mal formado, para no descubrir un typo
// a mitad de un scan en vivo durante la demo.
import fs from "fs";
import yaml from "js-yaml";
import type { Severity } from "../types/finding";
import type { Detector, Rule } from "../types/rule";

const VALID_SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];
const VALID_DETECTORS: Detector[] = ["regex", "semgrep"];

export function loadRules(filePath: string): Rule[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró el archivo de reglas: ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    throw new Error(`El archivo de reglas no es YAML válido (${filePath}): ${(err as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`El archivo de reglas debe ser una lista de reglas: ${filePath}`);
  }

  const seenIds = new Set<string>();
  return parsed.map((rule, index) => validateRule(rule, index, seenIds));
}

function validateRule(rule: unknown, index: number, seenIds: Set<string>): Rule {
  const r = rule as Record<string, unknown>;
  const label = `regla #${index}${typeof r?.id === "string" ? ` (${r.id})` : ""}`;

  if (!r || typeof r !== "object") {
    throw new Error(`${label}: debe ser un objeto`);
  }
  if (typeof r.id !== "string" || r.id.trim() === "") {
    throw new Error(`${label}: falta 'id' o no es un string`);
  }
  if (seenIds.has(r.id)) {
    throw new Error(`Regla duplicada: el id '${r.id}' ya existe en el archivo`);
  }
  seenIds.add(r.id);

  if (typeof r.pciRequirement !== "string" || r.pciRequirement.trim() === "") {
    throw new Error(`${label}: falta 'pciRequirement' o no es un string`);
  }
  if (typeof r.title !== "string" || r.title.trim() === "") {
    throw new Error(`${label}: falta 'title' o no es un string`);
  }
  if (!VALID_SEVERITIES.includes(r.severity as Severity)) {
    throw new Error(`${label}: 'severity' inválida (${String(r.severity)}) — debe ser una de ${VALID_SEVERITIES.join(", ")}`);
  }
  if (!VALID_DETECTORS.includes(r.detector as Detector)) {
    throw new Error(`${label}: 'detector' inválido (${String(r.detector)}) — debe ser uno de ${VALID_DETECTORS.join(", ")}`);
  }
  if (typeof r.pattern !== "string" || r.pattern.trim() === "") {
    throw new Error(`${label}: falta 'pattern' o no es un string`);
  }
  if (r.flags !== undefined && typeof r.flags !== "string") {
    throw new Error(`${label}: 'flags' debe ser un string si está presente`);
  }
  if (r.luhn !== undefined && typeof r.luhn !== "boolean") {
    throw new Error(`${label}: 'luhn' debe ser boolean si está presente`);
  }

  // Todas las reglas de hoy usan detector "regex" (ver nota en pci-rules.yaml);
  // igual se valida que el pattern compile, incluso si detector fuera "semgrep"
  // en el futuro, para no romper al leer un pattern con sintaxis inválida.
  try {
    // eslint-disable-next-line no-new
    new RegExp(r.pattern, (r.flags as string) ?? "");
  } catch (err) {
    throw new Error(`${label}: 'pattern' no es un RegExp válido — ${(err as Error).message}`);
  }

  return {
    id: r.id,
    pciRequirement: r.pciRequirement,
    title: r.title,
    severity: r.severity as Severity,
    detector: r.detector as Detector,
    pattern: r.pattern,
    flags: (r.flags as string) ?? "",
    luhn: (r.luhn as boolean) ?? false,
  };
}
