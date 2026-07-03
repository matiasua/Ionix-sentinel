// Opciones del selector "Repositorio" del topbar. Las 5 originales son ramas
// hardcodeadas del mismo repo (payments-core); `value` es la clave que el
// backend usa para decidir qué hallazgos sembrar al "Analizar repositorio"
// (ver backend/src/scan/seeds.ts). "live-scan" es la excepción: no siembra
// un catálogo fijo, corre el pipeline real (Analizador Estático + Motor de
// Razonamiento) contra SCAN_TARGET_PATH en el backend — requiere Postgres y,
// para las explicaciones de Claude, ANTHROPIC_API_KEY configurados.
export type BranchKey = "main" | "develop" | "demo-7" | "demo-3" | "demo-0" | "live-scan";

export interface RepoDef {
  value: BranchKey;
  name: string;
  branch: string;
  lastScan: string;
}

export const repos: RepoDef[] = [
  { value: "main", name: "payments-core", branch: "main", lastScan: "—" },
  { value: "develop", name: "payments-core", branch: "develop", lastScan: "—" },
  { value: "demo-7", name: "payments-core", branch: "demo/7-vulnerabilidades", lastScan: "—" },
  { value: "demo-3", name: "payments-core", branch: "demo/3-vulnerabilidades", lastScan: "—" },
  { value: "demo-0", name: "payments-core", branch: "demo/0-vulnerabilidades", lastScan: "—" },
  { value: "live-scan", name: "payments-core", branch: "live-scan (análisis real)", lastScan: "—" },
];
