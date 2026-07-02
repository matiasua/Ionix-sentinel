import { SNIPPET_LINE_STARTS } from "../lib/snippetLineStarts";

export default function CodeSnippet({
  ruleId,
  snippet,
  lineNumber,
}: {
  ruleId: string;
  snippet: string;
  lineNumber: number | null;
}) {
  const startLine = SNIPPET_LINE_STARTS[ruleId];
  const lines = snippet.split("\n");
  const highlightIndex =
    startLine !== undefined && lineNumber !== null ? lineNumber - startLine : -1;

  return (
    <pre className="code-snippet">
      <code>
        {lines.map((line, index) => (
          <div
            key={index}
            className={
              index === highlightIndex ? "code-snippet__line code-snippet__line--highlight" : "code-snippet__line"
            }
          >
            <span className="code-snippet__line-number">
              {startLine !== undefined ? startLine + index : ""}
            </span>
            <span className="code-snippet__line-content">{line}</span>
          </div>
        ))}
      </code>
    </pre>
  );
}
