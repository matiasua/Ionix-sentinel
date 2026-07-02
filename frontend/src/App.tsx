import { useEffect, useState } from "react";
import { getHealth } from "./api/client";
import DashboardPage from "./pages/DashboardPage";
import FindingsListPage from "./pages/FindingsListPage";
import FindingDetailPage from "./pages/FindingDetailPage";

type BackendStatus = "loading" | "ok" | "error";
type View = "dashboard" | "findings";

export default function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("loading");
  const [view, setView] = useState<View>("dashboard");
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(() => setBackendStatus("ok"))
      .catch(() => setBackendStatus("error"));
  }, []);

  function navigateTo(nextView: View) {
    setSelectedFindingId(null);
    setView(nextView);
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>IONIX Sentinel</h1>
          <p>Detección temprana de riesgos PCI-DSS en código y logs</p>
        </div>
        <div className={`status status--${backendStatus}`}>
          {backendStatus === "loading" && "Consultando backend..."}
          {backendStatus === "ok" && "Backend conectado"}
          {backendStatus === "error" && "Backend no disponible"}
        </div>
      </header>

      <nav className="app__nav">
        <button
          type="button"
          className={view === "dashboard" && !selectedFindingId ? "app__nav-item app__nav-item--active" : "app__nav-item"}
          onClick={() => navigateTo("dashboard")}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={view === "findings" && !selectedFindingId ? "app__nav-item app__nav-item--active" : "app__nav-item"}
          onClick={() => navigateTo("findings")}
        >
          Hallazgos
        </button>
      </nav>

      <main className="app__main">
        {backendStatus === "error" && (
          <p className="app__backend-warning">
            No se pudo conectar con el backend. Verifica que esté corriendo.
          </p>
        )}

        {selectedFindingId ? (
          <FindingDetailPage
            findingId={selectedFindingId}
            onBack={() => setSelectedFindingId(null)}
          />
        ) : view === "dashboard" ? (
          <DashboardPage onSelectFinding={setSelectedFindingId} />
        ) : (
          <FindingsListPage onSelectFinding={setSelectedFindingId} />
        )}
      </main>
    </div>
  );
}
