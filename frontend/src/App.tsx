import { useEffect, useState } from "react";
import type { Finding, Severity, Status } from "./api/client";
import { createFinding, getFindings } from "./api/client";
import { Sidebar, type Section } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { Toast } from "./components/ui/Toast";
import { ErrorState, LoadingState } from "./components/ui/States";
import { DashboardResumen } from "./views/DashboardResumen";
import { FindingsList } from "./views/FindingsList";
import { FindingDetail } from "./views/FindingDetail";
import { LogsSystems } from "./views/LogsSystems";
import { LogsSystemFindings } from "./views/LogsSystemFindings";
import { LogsComponentDetail } from "./views/LogsComponentDetail";
import { ConfigRules } from "./views/ConfigRules";
import { ConfigRepos } from "./views/ConfigRepos";
import { mockFindings, snippetStart as staticSnippetStart } from "./mocks/findings";
import { findingTraces, logFindings as logFindingsMock, logSnippetStart, logSystems } from "./mocks/logs";
import { repos } from "./mocks/repos";
import { SCAN_PHASES } from "./theme";

type StaticView = "dashboard" | "findings" | "detail";
type LogView = "systems" | "systemFindings" | "detail" | "componentDetail";

function nextScanPhase(pct: number): string {
  return SCAN_PHASES.filter(([threshold]) => pct >= threshold).pop()![1];
}

function findingKey(f: Pick<Finding, "ruleId" | "filePath" | "lineNumber">): string {
  return `${f.ruleId}|${f.filePath}|${f.lineNumber}`;
}

export default function App() {
  const [section, setSection] = useState<Section>("static");
  const [configOpen, setConfigOpen] = useState(false);
  const [view, setView] = useState<StaticView>("dashboard");
  const [logView, setLogView] = useState<LogView>("systems");
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [logFindingsState, setLogFindingsState] = useState<Finding[]>(logFindingsMock);
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
    setSelectedComponentId(null);
    setSelectedId(null);
    setFSev("all");
    setFReq("all");
  }

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

    // El backend todavía no expone POST /api/scan (docs/07-backend-spec.docs.md §5).
    // Mientras tanto, "escanear" persiste el fixture de mock-findings.ts vía el
    // POST /api/findings que ya existe, evitando duplicados por ruleId+filePath+lineNumber.
    try {
      const existingKeys = new Set((findings ?? []).map(findingKey));
      const toCreate = mockFindings.filter((f) => !existingKeys.has(findingKey(f)));
      for (const f of toCreate) {
        await createFinding({
          ruleId: f.ruleId,
          pciRequirement: f.pciRequirement,
          title: f.title,
          severity: f.severity,
          source: f.source,
          filePath: f.filePath,
          lineNumber: f.lineNumber,
          snippet: f.snippet,
        });
      }
      const fresh = await getFindings();
      setFindings(fresh);
      showToast(`Escaneo completado · ${fresh.length} hallazgos detectados`);
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
    window.setTimeout(() => {
      setLogsRefreshing(false);
      setLogFindingsState(logFindingsMock.map((f) => ({ ...f })));
      const now = new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      showToast(`Logs actualizados · ${now}`);
    }, 1300);
  }

  // El backend todavía no expone PATCH /api/findings/:id, así que el cambio de
  // estado es solo local por ahora (ver docs/07-backend-spec.docs.md §5).
  function changeStatus(id: string, status: Status, isLog: boolean) {
    if (isLog) {
      setLogFindingsState((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    } else {
      setFindings((prev) => (prev ? prev.map((f) => (f.id === id ? { ...f, status } : f)) : prev));
    }
    showToast("Estado actualizado (local)");
  }

  function toggleRule(ruleId: string) {
    setRuleEnabled((prev) => {
      const on = prev[ruleId] !== false;
      showToast(`Regla ${ruleId} ${on ? "desactivada" : "activada"}`);
      return { ...prev, [ruleId]: !on };
    });
  }

  const staticFindings = (findings ?? []).filter((f) => f.source === "code");
  const activeRepo = repos.find((r) => r.value === repo) ?? repos[0];
  const lastScanLabel = staticFindings.length ? `Último escaneo · ${activeRepo.lastScan} UTC` : "Sin escaneos registrados";

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
                snippetStart={staticSnippetStart[finding.id] ?? finding.lineNumber ?? 1}
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
    if (logView === "systems") {
      return (
        <LogsSystems
          logFindings={logFindingsState}
          refreshing={logsRefreshing}
          onRefresh={refreshLogs}
          onOpenSystem={(systemId) => {
            setSelectedSystemId(systemId);
            setLogView("systemFindings");
          }}
        />
      );
    }

    const system = logSystems.find((s) => s.id === selectedSystemId);

    if (logView === "systemFindings" && system) {
      const findingsForSystem = system.findingIds
        .map((id) => logFindingsState.find((f) => f.id === id))
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
      const finding = logFindingsState.find((f) => f.id === selectedId);
      if (!finding) return null;
      const trace = findingTraces[finding.id];
      return (
        <FindingDetail
          finding={finding}
          snippetStart={logSnippetStart[finding.id] ?? finding.lineNumber ?? 1}
          backLabel={`← ${system ? system.name : "sistema"}`}
          onBack={() => {
            setLogView("systemFindings");
            setSelectedId(null);
          }}
          onStatusChange={(status) => changeStatus(finding.id, status, true)}
          traceId={trace?.traceId}
          components={trace?.components}
          onOpenComponent={(componentId) => {
            setSelectedComponentId(componentId);
            setLogView("componentDetail");
          }}
        />
      );
    }

    if (logView === "componentDetail") {
      const finding = logFindingsState.find((f) => f.id === selectedId);
      const trace = finding ? findingTraces[finding.id] : null;
      const component = trace?.components.find((c) => c.id === selectedComponentId);
      if (!component || !trace) return null;
      return (
        <LogsComponentDetail
          component={component}
          traceId={trace.traceId}
          logFile={system?.logFile ?? finding?.filePath ?? ""}
          onBack={() => {
            setLogView("detail");
            setSelectedComponentId(null);
          }}
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
              setRepo(value);
              showToast(`Repositorio activo → ${value}`);
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
            <ConfigRepos activeRepo={repo} totalFindings={staticFindings.length} onSelectRepo={(value) => { setRepo(value); showToast(`Repositorio activo → ${value}`); }} onAddRepo={() => showToast("Conecta un repo desde Git (demo)")} />
          )}
        </main>
      </div>

      <Toast message={toast} />
    </div>
  );
}
