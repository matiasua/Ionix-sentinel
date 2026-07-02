// Portado de frontend/design/ionix-sentinel.dc.html — repositorios conectados.
// Configuración → Repositorios es solo UI local por ahora (sin tabla `repositories` expuesta vía API todavía).
export interface RepoDef {
  value: string;
  name: string;
  branch: string;
  lastScan: string;
}

export const repos: RepoDef[] = [
  { value: "payments-core", name: "payments-core", branch: "main", lastScan: "02 JUL 2026 09:14" },
  { value: "ledger-api", name: "ledger-api", branch: "main", lastScan: "01 JUL 2026 18:02" },
  { value: "fraud-engine", name: "fraud-engine", branch: "develop", lastScan: "30 JUN 2026 11:47" },
  { value: "merchant-portal", name: "merchant-portal", branch: "main", lastScan: "28 JUN 2026 20:15" },
];
