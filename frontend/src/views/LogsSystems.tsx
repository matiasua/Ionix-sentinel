import type { Finding, LogSystemView } from "../api/client";
import { RiskScoreGauge } from "../components/ui/RiskScoreGauge";
import { SeverityTiles } from "../components/ui/SeverityTiles";
import { systemHealth } from "../mocks/logs";
import { computeRiskScore, countBySeverity, riskLevel } from "../theme";

export function LogsSystems({
  logFindings,
  systems: systemDefs,
  refreshing,
  onRefresh,
  onOpenSystem,
  autoRefreshSeconds,
}: {
  logFindings: Finding[];
  systems: LogSystemView[];
  refreshing: boolean;
  onRefresh: () => void;
  onOpenSystem: (systemId: string) => void;
  // Cada cuántos segundos se refresca solo este dashboard (ver
  // LOG_AUTO_REFRESH_MS en App.tsx) — ya no es un texto fijo.
  autoRefreshSeconds: number;
}) {
  const active = logFindings.filter((f) => f.status === "open" || f.status === "acknowledged");
  const counts = countBySeverity(active);
  const riskScore = computeRiskScore(counts);
  const level = riskLevel(riskScore);

  const systems = systemDefs.map((sys) => {
    const fs = sys.findingIds.map((id) => logFindings.find((f) => f.id === id)).filter(Boolean) as Finding[];
    const health = systemHealth(fs);
    const traffic =
      health.key === "critical" || health.key === "degraded"
        ? { color: "#FF7A76", bg: "rgba(255,92,92,0.16)", label: "Crítico" }
        : health.key === "warning"
          ? { color: "#E8C77A", bg: "rgba(232,199,122,0.16)", label: "Atención" }
          : { color: "#79BE96", bg: "rgba(121,190,150,0.16)", label: "OK" };
    return { sys, health, traffic };
  });
  const systemsWithIssues = systems.filter((s) => s.health.label !== "OPERATIVO").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Resumen de logs</h1>
          <p>
            Análisis de logs de aplicación · {logFindings.length} hallazgos · {active.length} activos
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 }}>
          <button className={`btn btn-primary${refreshing ? " btn-primary--busy" : ""}`} disabled={refreshing} onClick={onRefresh}>
            {refreshing ? (
              <>
                <span className="spinner" />
                <span>Actualizando…</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" stroke="#170B03" strokeWidth="1.7" strokeLinecap="round" />
                  <path d="M12.6 1.8V4.6H9.8" stroke="#170B03" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Actualizar escaneo</span>
              </>
            )}
          </button>
          <span className="mono" style={{ fontSize: 11, color: "rgba(245,241,237,0.4)" }}>
            Auto-refresco cada {autoRefreshSeconds} s
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, marginTop: 24 }}>
        <RiskScoreGauge label="RISK SCORE · LOGS" score={riskScore} color={level.color} bg={level.bg} levelLabel={level.label} />
        <SeverityTiles counts={counts} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 26, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Monitoreo por sistema</h2>
        <span className="mono" style={{ fontSize: 12, color: "rgba(245,241,237,0.5)" }}>
          {systemsWithIssues === 0 ? `${systems.length} sistemas · todos operativos` : `${systems.length} sistemas · ${systemsWithIssues} requieren atención`}
        </span>
      </div>

      <div className="panel panel--overflow">
        <div className="panel-row-head" style={{ gridTemplateColumns: "168px 1fr 200px 24px" }}>
          <span>STATUS</span>
          <span>SISTEMA</span>
          <span>ESTADO DE HALLAZGOS</span>
          <span />
        </div>
        {systems.map(({ sys, health, traffic }) => (
          <div
            key={sys.id}
            className="panel-row"
            style={{ gridTemplateColumns: "168px 1fr 200px 24px" }}
            onClick={() => onOpenSystem(sys.id)}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
              <span className="dot dot--glow" style={{ background: health.dot, color: health.dot }} />
              <span className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", fontWeight: 600, color: health.color }}>
                {health.label}
              </span>
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
                {sys.name}
              </span>
              <span style={{ fontSize: 12.5, color: "rgba(245,241,237,0.50)" }}>{sys.role}</span>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                justifySelf: "start",
                background: traffic.bg,
                border: `1px solid ${traffic.color}`,
                borderRadius: 999,
                padding: "5px 14px",
              }}
            >
              <span className="dot dot--glow" style={{ background: traffic.color, color: traffic.color }} />
              <span className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 600, color: traffic.color }}>
                {traffic.label}
              </span>
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ justifySelf: "end" }}>
              <path d="M6 3.5L10.5 8L6 12.5" stroke="rgba(245,241,237,0.4)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
