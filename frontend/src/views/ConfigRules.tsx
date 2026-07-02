import { rules } from "../mocks/rules";
import { SEV_META } from "../theme";
import { sourceLabelOf } from "../utils/findings";

export function ConfigRules({
  enabledMap,
  onToggle,
}: {
  enabledMap: Record<string, boolean>;
  onToggle: (ruleId: string) => void;
}) {
  const activeCount = rules.filter((r) => enabledMap[r.id] !== false).length;

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.01em" }}>Reglas de detección</h1>
        <p style={{ margin: 0, color: "var(--text-dim)", fontSize: 14.5 }}>
          {rules.length} reglas · {activeCount} activas
        </p>
      </div>
      <div className="panel panel--overflow" style={{ marginTop: 20 }}>
        <div className="panel-row-head rules-grid">
          <span>RULE ID</span>
          <span>DESCRIPCIÓN</span>
          <span style={{ textAlign: "center" }}>REQ.</span>
          <span>SEVERIDAD</span>
          <span style={{ textAlign: "right" }}>ESTADO</span>
        </div>
        {rules.map((r) => {
          const on = enabledMap[r.id] !== false;
          const sev = SEV_META[r.severity];
          return (
            <div key={r.id} className="panel-row rules-grid" style={{ cursor: "default" }}>
              <span className="mono" style={{ fontSize: 12, color: "#FF8B4D" }}>
                {r.id}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</span>
                <span className="mono" style={{ fontSize: 11.5, color: "rgba(245,241,237,0.40)" }}>
                  {sourceLabelOf(r)} · {r.category}
                </span>
              </div>
              <span className="pci-badge" style={{ textAlign: "center" }}>
                PCI {r.pci}
              </span>
              <span className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 600, color: sev.color }}>
                {sev.label}
              </span>
              <button
                className="rule-toggle"
                style={{
                  border: `1px solid ${on ? "rgba(121,190,150,0.4)" : "rgba(255,255,255,0.14)"}`,
                  background: on ? "rgba(121,190,150,0.12)" : "rgba(255,255,255,0.04)",
                }}
                onClick={() => onToggle(r.id)}
              >
                <span className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: on ? "#79BE96" : "rgba(245,241,237,0.35)" }}>
                  {on ? "ACTIVA" : "INACTIVA"}
                </span>
                <span className="dot" style={{ width: 16, height: 16, background: on ? "#79BE96" : "rgba(245,241,237,0.35)" }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
