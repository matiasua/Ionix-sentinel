import { CodeSnippet } from "../components/ui/CodeSnippet";
import { COMP_META, type TraceComponent } from "../mocks/logs";
import { buildSnippetLines } from "../utils/findings";

export function LogsComponentDetail({
  component,
  traceId,
  logFile,
  onBack,
}: {
  component: TraceComponent;
  traceId: string;
  logFile: string;
  onBack: () => void;
}) {
  const meta = COMP_META[component.status];
  const lines = buildSnippetLines(component.snippet, component.snippetStart, component.line);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <button className="btn-back" onClick={onBack}>
        ← Volver al incidente
      </button>

      <div className="detail-header">
        <div className="detail-header__badges">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              fontWeight: 600,
              color: meta.color,
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${meta.color}`,
              borderRadius: 999,
              padding: "4px 12px",
            }}
          >
            <span className="dot dot--glow" style={{ background: meta.color, color: meta.color }} />
            {meta.label}
          </span>
          <span className="pill-source">{component.type}</span>
          <span className="pill-req" style={{ marginLeft: "auto" }}>
            trace {traceId}
          </span>
        </div>
        <h1 className="mono" style={{ fontSize: 23, fontWeight: 700 }}>
          {component.name}
        </h1>
        <p className="mono" style={{ margin: 0, fontSize: 12.5, color: "var(--text-dim)" }}>
          <span style={{ color: "#F5F1ED" }}>
            {logFile}:{component.line}
          </span>{" "}
          · invocado en la traza correlacionada
        </p>
      </div>

      <CodeSnippet fileLabel={logFile} lineLabel={`línea ${component.line}`} lines={lines} />
    </div>
  );
}
