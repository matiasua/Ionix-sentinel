// Línea de inicio de cada snippet de demo, para resaltar la línea exacta del
// hallazgo dentro del bloque de código (ver backend/src/scan/fixtures.ts).
// Indexado por ruleId (estable entre corridas de escaneo, a diferencia del id
// de fila que genera Postgres). Si un ruleId no aparece acá, CodeSnippet cae
// al comportamiento por defecto: no resalta ninguna línea interna.
export const SNIPPET_LINE_STARTS: Record<string, number> = {
  "SENTINEL-PAN-001": 9,
  "SENTINEL-KEY-003": 44,
  "SENTINEL-LOG-002": 4209,
  "SENTINEL-INJ-001": 87,
  "SENTINEL-TLS-004": 20,
  "SENTINEL-PWD-002": 14,
  "SENTINEL-SES-001": 29,
  "SENTINEL-DEP-005": 22,
  "SENTINEL-SES-003": 7,
  "SENTINEL-HDR-001": 1186,
  "SENTINEL-LOG-006": 38,
  "SENTINEL-DBG-002": 16,
};
