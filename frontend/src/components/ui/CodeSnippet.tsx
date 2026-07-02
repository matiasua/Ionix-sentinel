import type { SnippetLine } from "../../utils/findings";

export function CodeSnippet({
  fileLabel,
  lineLabel,
  lines,
}: {
  fileLabel: string;
  lineLabel: string;
  lines: SnippetLine[];
}) {
  return (
    <div className="code-snippet">
      <div className="code-snippet__head">
        <span>{fileLabel}</span>
        <span style={{ color: "#FF8B4D" }}>{lineLabel}</span>
      </div>
      <div className="code-snippet__body">
        {lines.map((ln) => (
          <div
            key={ln.num}
            className="code-line"
            style={{
              background: ln.isHighlighted ? "rgba(255,107,26,0.10)" : "transparent",
              borderLeftColor: ln.isHighlighted ? "#FF6B1A" : "transparent",
            }}
          >
            <span className="code-line__num" style={{ color: ln.isHighlighted ? "#FF8B4D" : "rgba(245,241,237,0.30)" }}>
              {ln.num}
            </span>
            <span className="code-line__text" style={{ color: ln.isHighlighted ? "#F5F1ED" : "rgba(245,241,237,0.75)" }}>
              {ln.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
