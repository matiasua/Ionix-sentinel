import { useEffect, useState } from "react";
import {
  Finding,
  ScanSummary,
  Severity,
  getFindings,
  getLatestScan,
  triggerScan,
} from "../api/client";
import { SEVERITY_ORDER } from "../lib/severity";
import RiskScoreGauge from "../components/RiskScoreGauge";
import SeverityTile from "../components/SeverityTile";
import ScanButton from "../components/ScanButton";
import FindingsTable from "../components/FindingsTable";
import { EmptyState, ErrorState, LoadingState } from "../components/UiStates";

type LoadState = "loading" | "ready" | "error";
type ScanState = "idle" | "scanning" | "error";

export default function DashboardPage({
  onSelectFinding,
}: {
  onSelectFinding: (id: string) => void;
}) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [recentFindings, setRecentFindings] = useState<Finding[]>([]);

  async function load() {
    setLoadState("loading");
    try {
      const latestScan = await getLatestScan();
      setSummary(latestScan);

      if (latestScan.scanId) {
        const findings = await getFindings({ scanId: latestScan.scanId });
        setRecentFindings(findings.slice(0, 10));
      } else {
        setRecentFindings([]);
      }
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleScan() {
    setScanState("scanning");
    try {
      await triggerScan();
      await load();
      setScanState("idle");
    } catch {
      setScanState("error");
    }
  }

  if (loadState === "loading") {
    return <LoadingState message="Consultando estado del análisis..." />;
  }

  if (loadState === "error") {
    return <ErrorState message="No se pudo cargar el dashboard." onRetry={load} />;
  }

  if (!summary?.scanId) {
    return (
      <EmptyState
        message="Todavía no se ha ejecutado ningún escaneo."
        action={<ScanButton state={scanState} onScan={handleScan} />}
      />
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__summary">
        <RiskScoreGauge score={summary.riskScore} />
        <div className="dashboard-page__tiles">
          {SEVERITY_ORDER.map((severity: Severity) => (
            <SeverityTile
              key={severity}
              severity={severity}
              count={summary.severityCounts[severity] ?? 0}
            />
          ))}
        </div>
      </div>

      <div className="dashboard-page__actions">
        <ScanButton state={scanState} onScan={handleScan} />
        {scanState === "error" && <span className="dashboard-page__scan-error">El escaneo falló. Intenta de nuevo.</span>}
      </div>

      <section>
        <h2>Hallazgos recientes</h2>
        {recentFindings.length === 0 ? (
          <p>No hay hallazgos para este escaneo.</p>
        ) : (
          <FindingsTable findings={recentFindings} onSelect={onSelectFinding} />
        )}
      </section>
    </div>
  );
}
