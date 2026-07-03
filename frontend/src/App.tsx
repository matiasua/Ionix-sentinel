import { useEffect, useState } from "react";
import type { BranchLogPayload, Finding, Status } from "./api/client";
import { getFindings, getLogs, triggerScan, updateFindingStatus } from "./api/client";
import { Sidebar, type Section } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { Toast } from "./components/ui/Toast";
import { EmptyState, ErrorState, LoadingState } from "./components/ui/States";
import { DashboardResumen } from "./views/DashboardResumen";
import { FindingsList } from "./views/FindingsList";
import { FindingDetail } from "./views/FindingDetail";
import { LogsSystems } from "./views/LogsSystems";
import { LogsSystemFindings } from "./views/LogsSystemFindings";
import { ConfigRules } from "./views/ConfigRules";
import { ConfigRepos } from "./views/ConfigRepos";
import { mockFindings, snippetStart as snippetStartById } from "./mocks/findings";
import { repos } from "./mocks/repos";
import { SCAN_PHASES } from "./theme";

type StaticView = "dashboard" | "findings" | "detail";
type LogView = "systems" | "systemFindings" | "detail";
type Severity = Finding["severity"];

function nextScanPhase(pct: number): string {
  return SCAN_PHASES.filter(([threshold]) => pct >= threshold).pop()![1];
}

// El id de finding lo genera Postgres (UUID) en cada scan, así que no calza con
// los ids fijos ("fnd_001"...) del fixture de mocks/findings.ts. ruleId sí es
// estable entre corridas de escaneo — se usa para ubicar la línea de inicio del
// snippet y resaltar la línea exacta del hallazgo.
const snippetStartByRuleId: Record<string, number> = Object.fromEntries(
  mockFindings.map((f) => [f.ruleId, snippetStartById[f.id]])
);

export default function App() {
  const [section, setSection] = useState<Section>("static");
  const [configOpen, setConfigOpen] = useState(false);
  const [view, setView] = useState<StaticView>("dashboard");
  const [logView, setLogView] = useState<LogView>("systems");
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [logData, setLogData] = useState<BranchLogPayload | null>(null);
  const [logsRefreshing, setLogsRefreshing] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [scanPct, setScanPct] = useState(0);

  const [fSev, setFSev] = useState<Severity | "all">("all");
  const [fReq, setFReq] = useState<string>("all");
  const [narrow, setNarrow] = useState(window.innerWidth < 1080);
  const [toast, setToast] = useState<string | null>(null);
  const [repo, setRepo] = useState(repos[0].value);
  const [ruleEnabled, setRuleEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1080);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    loadData();
    getLogs(repos[0].value).then(setLogData).catch(() => setLogData(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadData() {
    setLoadError(false);
    setFindings(null);
    getFindings()
      .then(setFindings)
      .catch(() => setLoadError(true));
  }

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4200);
  }

  function gotoSection(next: Section) {
    setSection(next);
    setView("dashboard");
    setLogView("systems");
    setSelectedSystemId(null);
    setSelectedId(null);
    setFSev("all");
    setFReq("all");
  }

  const activeRepo = repos.find((r) => r.value === repo) ?? repos[0];

  // "Analizar repositorio": el backend borra e inserta los hallazgos de la rama
  // seleccionada, y regenera su archivo de logs. Refrescamos ambos dashboards.
  async function startScan() {
    if (scanning) return;
    setScanning(true);
    setScanPct(0);

    await new Promise<void>((resolve) => {
      let pct = 0;
      const timer = window.setInterval(() => {
        pct = Math.min(100, pct + 1.5 + Math.random() * 3.5);
        setScanPct(Math.round(pct));
        if (pct >= 100) {
          window.clearInterval(timer);
          resolve();
        }
      }, 110);
    });

    try {
      const result = await triggerScan(repo);
      const [fresh, logs] = await Promise.all([getFindings(), getLogs(repo)]);
      setFindings(fresh);
      setLogData(logs);
      showToast(
        `${activeRepo.name} · ${activeRepo.branch} — ${result.findingsCount} hallazgos · risk score ${result.riskScore}`
      );
    } catch {
      showToast("El escaneo terminó pero no se pudo guardar en la base de datos");
    } finally {
      setScanning(false);
      setScanPct(0);
    }
  }

  function refreshLogs() {
    if (logsRefreshing) return;
    setLogsRefreshing(true);
    getLogs(logData?.branch ?? repo)
      .then((logs) => {
        setLogData(logs);
        const now = new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        showToast(`Logs actualizados · ${now}`);
      })
      .catch(() => showToast("No se pudieron actualizar los logs"))
      .finally(() => setLogsRefreshing(false));
  }

  // Los findings de logs se sirven desde el archivo generado (no persisten en DB);
  // su cambio de estado se queda local. Los de código sí persisten vía PATCH.
  function changeStatus(id: string, status: Status, isLog: boolean) {
    if (isLog) {
      setLogData((prev) => (prev ? { ...prev, findings: prev.findings.map((f) => (f.id === id ? { ...f, status } : f)) } : prev));
      showToast("Estado actualizado (local · logs)");
      return;
    }

    setFindings((prev) => (prev ? prev.map((f) => (f.id === id ? { ...f, status } : f)) : prev));
    updateFindingStatus(id, status)
      .then(() => showToast("Estado actualizado"))
      .catch(() => {
        showToast("No se pudo guardar el nuevo estado");
        loadData();
      });
  }

  function toggleRule(ruleId: string) {
    setRuleEnabled((prev) => {
      const on = prev[ruleId] !== false;
      showToast(`Regla ${ruleId} ${on ? "desactivada" : "activada"}`);
      return { ...prev, [ruleId]: !on };
    });
  }

  const staticFindings = (findings ?? []).filter((f) => f.source === "code");
  const lastScanLabel = staticFindings.length
    ? `${activeRepo.name} · ${activeRepo.branch}`
    : "Sin hallazgos — presiona Escanear repo";

  function renderStatic() {
    if (loadError) {
      return (
        <ErrorState
          title="No se pudieron cargar los hallazgos"
          code="GET /api/findings → 500 Internal Server Error"
          message="La API no respondió. Verifica que el backend esté corriendo (docker compose up) y reintenta."
          onRetry={loadData}
        />
      );
    }
    if (findings === null) return <LoadingState />;

    return (
      <>
        <div className="tabs">
          <button className={`tab${view === "dashboard" ? " tab--active" : ""}`} onClick={() => setView("dashboard")}>
            Resumen
          </button>
          <button className={`tab${view !== "dashboard" ? " tab--active" : ""}`} onClick={() => setView("findings")}>
            Hallazgos
            <span className="tab__count">{staticFindings.filter((f) => f.status === "open" || f.status === "acknowledged").length}</span>
          </button>
        </div>

        {view === "dashboard" && (
          <DashboardResumen
            findings={staticFindings}
            scanning={scanning}
            scanPct={scanPct}
            onScan={startScan}
            onOpenFinding={(id) => {
              setSelectedId(id);
              setView("detail");
            }}
            onSeeAll={() => setView("findings")}
            onFilterSeverity={(sev) => {
              setFSev(sev);
              setFReq("all");
              setView("findings");
            }}
            narrow={narrow}
          />
        )}

        {view === "findings" && (
          <FindingsList
            findings={staticFindings}
            severityFilter={fSev}
            onSeverityFilterChange={setFSev}
            requirementFilter={fReq}
            onRequirementFilterChange={setFReq}
            onOpenFinding={(id) => {
              setSelectedId(id);
              setView("detail");
            }}
            onScan={startScan}
            narrow={narrow}
          />
        )}

        {view === "detail" &&
          (() => {
            const finding = staticFindings.find((f) => f.id === selectedId);
            if (!finding) return null;
            return (
              <FindingDetail
                finding={finding}
                snippetStart={snippetStartByRuleId[finding.ruleId] ?? finding.lineNumber ?? 1}
                backLabel="← Volver a hallazgos"
                onBack={() => setView("findings")}
                onStatusChange={(status) => changeStatus(finding.id, status, false)}
              />
            );
          })()}
      </>
    );
  }

  function renderLogs() {
    if (!logData) {
      return (
        <EmptyState
          title="Aún no hay logs analizados"
          description="Selecciona una rama en el dashboard estático y presiona Escanear repo para generar sus logs."
          ctaLabel="Ir al dashboard estático"
          onCta={() => gotoSection("static")}
        />
      );
    }

    if (logView === "systems") {
      return (
        <LogsSystems
          logFindings={logData.findings}
          systems={logData.systems}
          refreshing={logsRefreshing}
          onRefresh={refreshLogs}
          onOpenSystem={(systemId) => {
            setSelectedSystemId(systemId);
            setLogView("systemFindings");
          }}
        />
      );
    }

    const system = logData.systems.find((s) => s.id === selectedSystemId);

    if (logView === "systemFindings" && system) {
      const findingsForSystem = system.findingIds
        .map((id) => logData.findings.find((f) => f.id === id))
        .filter((f): f is Finding => Boolean(f));
      return (
        <LogsSystemFindings
          system={system}
          findings={findingsForSystem}
          onBack={() => {
            setLogView("systems");
            setSelectedSystemId(null);
          }}
          onOpenFinding={(id) => {
            setSelectedId(id);
            setLogView("detail");
          }}
          narrow={narrow}
        />
      );
    }

    if (logView === "detail") {
      const finding = logData.findings.find((f) => f.id === selectedId);
      if (!finding) return null;
      return (
        <FindingDetail
          finding={finding}
          snippetStart={1}
          backLabel={`← ${system ? system.name : "sistemas"}`}
          onBack={() => {
            setLogView("systemFindings");
            setSelectedId(null);
          }}
          onStatusChange={(status) => changeStatus(finding.id, status, true)}
        />
      );
    }

    return null;
  }

  return (
    <div className="app">
      <Sidebar
        section={section}
        configOpen={configOpen}
        onNavigate={(next) => {
          if (next === "rules" || next === "repos") setConfigOpen(true);
          gotoSection(next);
        }}
        onToggleConfig={() => setConfigOpen((v) => !v)}
      />

      <div className="main">
        {section === "static" && (
          <Topbar
            repos={repos}
            repo={repo}
            onRepoChange={(value) => {
              setRepo(value as typeof repo);
              const r = repos.find((x) => x.value === value);
              showToast(`Rama seleccionada → ${r?.branch ?? value} · presiona Escanear repo para analizar`);
            }}
            lastScanLabel={lastScanLabel}
          />
        )}

        <main className="content">
          {scanning && section === "static" && (
            <div className="scanning-strip">
              <div className="scanning-strip__row">
                <span style={{ color: "#FF8B4D" }}>▸ {nextScanPhase(scanPct)}</span>
                <span style={{ color: "rgba(245,241,237,0.66)" }}>{scanPct}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${scanPct}%` }} />
              </div>
            </div>
          )}

          {section === "static" && renderStatic()}
          {section === "logs" && renderLogs()}
          {section === "rules" && <ConfigRules enabledMap={ruleEnabled} onToggle={toggleRule} />}
          {section === "repos" && (
            <ConfigRepos activeRepo={repo} totalFindings={staticFindings.length} onSelectRepo={(value) => { setRepo(value as typeof repo); showToast(`Rama seleccionada → ${value}`); }} onAddRepo={() => showToast("Conecta un repo desde Git (demo)")} />
          )}
        </main>
      </div>

      <Toast message={toast} />
    </div>
  );
}
