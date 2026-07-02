import type { Finding, Status } from "../api/client";
import { CodeSnippet } from "../components/ui/CodeSnippet";
import { SeverityBadge } from "../components/ui/SeverityBadge";
import { StatusSelect } from "../components/ui/StatusSelect";
import { COMP_META, type TraceComponent } from "../mocks/logs";
import { buildSnippetLines, dateStrOf, lineLabelOf, locationOf, sourceLabelOf } from "../utils/findings";

export function FindingDetail({
  finding,
  snippetStart,
  backLabel,
  onBack,
  onStatusChange,
  traceId,
  components,
  onOpenComponent,
}: {
  finding: Finding;
  snippetStart: number;
  backLabel: string;
  onBack: () => void;
  onStatusChange: (status: Status) => void;
  traceId?: string;
  components?: TraceComponent[];
  onOpenComponent?: (componentId: string) => void;
}) {
  const lines = buildSnippetLines(finding.snippet, snippetStart, finding.lineNumber);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <button className="btn-back" onClick={onBack}>
        {backLabel}
      </button>

      <div className="detail-header">
        <div className="detail-header__badges">
          <SeverityBadge severity={finding.severity} />
          <span className="pill-req">PCI-DSS {finding.pciRequirement}</span>
          <span className="pill-source">{sourceLabelOf(finding)}</span>
          <span style={{ marginLeft: "auto" }}>
            <StatusSelect value={finding.status} onChange={onStatusChange} />
          </span>
        </div>
        <h1>{finding.title}</h1>
        <div className="detail-header__meta">
          <span style={{ color: "#F5F1ED" }}>{locationOf(finding)}</span>
          <span>{finding.ruleId}</span>
          <span>{dateStrOf(finding.createdAt)}</span>
        </div>
      </div>

      <CodeSnippet fileLabel={finding.filePath} lineLabel={lineLabelOf(finding)} lines={lines} />

      <div className="claude-grid">
        <div className="claude-card">
          <div className="claude-card__head">
            <h3>Por qué es una violación</h3>
            <span className="claude-tag">✦ GENERADO POR CLAUDE</span>
          </div>
          <p>{finding.explanation}</p>
        </div>
        <div className="claude-card">
          <div className="claude-card__head">
            <h3>Cómo corregirlo</h3>
            <span className="claude-tag">✦ GENERADO POR CLAUDE</span>
          </div>
          <p>{finding.remediation}</p>
        </div>
      </div>

      {components && components.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15.5, fontWeight: 800 }}>Componentes involucrados</span>
            <span className="mono" style={{ fontSize: 11.5, color: "rgba(245,241,237,0.45)" }}>
              {components.length} componentes · trace {traceId}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(245,241,237,0.5)", lineHeight: 1.5 }}>
            Componentes correlacionados por el trace ID de este incidente. Haz click en uno para ver la línea del log donde fue invocado.
          </p>
          <div className="trace-cards">
            {components.map((c, i) => {
              const meta = COMP_META[c.status];
              return (
                <div key={c.id} className="trace-card" onClick={() => onOpenComponent?.(c.id)}>
                  <div className="trace-card__head">
                    <span className="trace-card__order">{String(i + 1).padStart(2, "0")}</span>
                    <span className="dot dot--glow" style={{ background: meta.color, color: meta.color }} />
                  </div>
                  <span className="trace-card__name">{c.name}</span>
                  <span className="trace-card__type">{c.type}</span>
                  <div className="trace-card__foot">
                    <span style={{ color: meta.color }}>{meta.label}</span>
                    <span style={{ color: "#FF8B4D" }}>línea {c.line}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
