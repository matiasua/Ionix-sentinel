// Tipos del motor de reglas PCI-DSS (backend/src/rules/pci-rules.yaml).
// Espejo TypeScript del esquema documentado en el encabezado de ese archivo.
import type { Severity } from "./finding";

export type Detector = "regex" | "semgrep";

export interface Rule {
  id: string;
  pciRequirement: string;
  title: string;
  severity: Severity;
  detector: Detector;
  pattern: string;
  /** Flags de RegExp (ej. "i"). Vacío si no se especifica en el YAML. */
  flags: string;
  /**
   * Si es true, cada coincidencia numérica del match debe pasar el algoritmo
   * de Luhn (analysis/luhn.ts) antes de emitirse como finding (HU-B1.3).
   */
  luhn: boolean;
}
