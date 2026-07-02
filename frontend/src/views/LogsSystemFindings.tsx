import type { Finding } from "../api/client";
import { SeverityBadge } from "../components/ui/SeverityBadge";
import type { LogSystem } from "../mocks/logs";
import { reqLabelOf, sortBySeverityDesc, sourceLabelOf } from "../utils/findings";

export function LogsSystemFindings({
  system,
  findings,
  onBack,
  onOpenFinding,
  narrow,
}: {
  system: LogSystem;
  findings: Finding[];
  onBack: () => void;
  onOpenFinding: (id: string) => void;
  narrow: boolean;
}) {
  const sorted = sortBySeverityDesc(findings);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button className="btn-back" onClick={onBack}>
        ← Sistemas
      </button>
      <div className="panel" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 className="mono" style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          {system.name}
        </h1>
        <p style={{ margin: 0, color: "var(--text-dim)", fontSize: 14 }}>
          {system.role} · <span className="mono" style={{ fontSize: 12.5 }}>{system.logFile}</span>
        </p>
        <p className="mono" style={{ margin: "4px 0 0", fontSize: 12.5, color: "#FF8B4D" }}>
          {sorted.length} hallazgos en este sistema
        </p>
      </div>

      {sorted.length === 0 && (
        <div className="state-box" style={{ background: "var(--bg-panel)", border: "1px solid rgba(121,190,150,0.3)", padding: "48px 32px", marginTop: 16 }}>
          <span className="state-icon" style={{ background: "rgba(121,190,150,0.14)", color: "#79BE96", width: 40, height: 40 }}>
            ✓
          </span>
          <h3 style={{ fontSize: 17 }}>Sistema operativo</h3>
          <p>No se detectaron hallazgos de compliance en los logs de este sistema.</p>
        </div>
      )}

      {sorted.length > 0 && !narrow && (
        <div className="panel panel--overflow" style={{ marginTop: 16 }}>
          <div className="panel-row-head findings-row-grid--recent">
            <span>SEVERIDAD</span>
            <span>HALLAZGO</span>
            <span style={{ textAlign: "center" }}>REQ.</span>
          </div>
          {sorted.map((f) => (
            <div key={f.id} className="panel-row findings-row-grid--recent" onClick={() => onOpenFinding(f.id)}>
              <SeverityBadge severity={f.severity} />
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {f.title}
                </span>
                <span className="mono" style={{ fontSize: 11.5, color: "rgba(245,241,237,0.40)" }}>
                  {sourceLabelOf(f)} · {f.ruleId}
                </span>
              </div>
              <span className="pci-badge">{reqLabelOf(f)}</span>
            </div>
          ))}
        </div>
      )}

      {sorted.length > 0 && narrow && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {sorted.map((f) => (
            <div key={f.id} className="finding-card" onClick={() => onOpenFinding(f.id)}>
              <span style={{ alignSelf: "flex-start" }}>
                <SeverityBadge severity={f.severity} />
              </span>
              <span className="finding-card__title">{f.title}</span>
              <div className="finding-card__meta">
                <span className="pci-badge">{reqLabelOf(f)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
