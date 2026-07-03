import type { Finding, Severity } from "../api/client";
import { RiskScoreGauge } from "../components/ui/RiskScoreGauge";
import { SeverityTiles } from "../components/ui/SeverityTiles";
import { ScanButton } from "../components/ui/ScanButton";
import { EmptyState } from "../components/ui/States";
import { SeverityBadge } from "../components/ui/SeverityBadge";
import { computeRiskScore, countBySeverity, riskLevel } from "../theme";
import { locationOf, reqLabelOf, sortBySeverityDesc } from "../utils/findings";

export function DashboardResumen({
  findings,
  scanning,
  scanPct,
  onScan,
  onOpenFinding,
  onSeeAll,
  onFilterSeverity,
  narrow,
}: {
  findings: Finding[];
  scanning: boolean;
  scanPct: number;
  onScan: () => void;
  onOpenFinding: (id: string) => void;
  onSeeAll: () => void;
  onFilterSeverity: (severity: Severity) => void;
  narrow: boolean;
}) {
  const active = findings.filter((f) => f.status === "open" || f.status === "acknowledged");
  const counts = countBySeverity(active);
  const riskScore = computeRiskScore(counts);
  const level = riskLevel(riskScore);
  const isEmpty = findings.length === 0;
  const recent = sortBySeverityDesc(findings).slice(0, 8);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Resumen de cumplimiento</h1>
          <p>
            Análisis estático de código · {findings.length} hallazgos · {active.length} activos
          </p>
        </div>
        <ScanButton scanning={scanning} scanPct={scanPct} onClick={onScan} />
      </div>

      {isEmpty ? (
        <EmptyState
          title="Aún no hay hallazgos"
          description="Ejecuta el primer escaneo del repositorio para detectar vulnerabilidades PCI-DSS."
          ctaLabel="Escanear repo"
          onCta={onScan}
        />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "360px 1fr", gap: 20, marginTop: 24 }}>
            <RiskScoreGauge label="RISK SCORE AGREGADO" score={riskScore} color={level.color} bg={level.bg} levelLabel={level.label} />
            <SeverityTiles counts={counts} onSelect={onFilterSeverity} />
          </div>

          <div className="panel panel--overflow" style={{ marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Hallazgos recientes</h2>
              <button className="btn-link" onClick={onSeeAll}>
                Ver todos →
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recent.map((f) => (
                <div
                  key={f.id}
                  className="panel-row findings-row-grid--recent"
                  onClick={() => onOpenFinding(f.id)}
                >
                  <SeverityBadge severity={f.severity} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {f.title}
                    </span>
                    <span className="mono" style={{ fontSize: 12, color: "rgba(245,241,237,0.40)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {locationOf(f)}
                    </span>
                  </div>
                  <span className="pci-badge">{reqLabelOf(f)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
