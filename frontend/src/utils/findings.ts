import type { Finding, Severity } from "../api/client";
import { SEV_META } from "../theme";

export function locationOf(f: Pick<Finding, "filePath" | "lineNumber">): string {
  return f.lineNumber != null ? `${f.filePath}:${f.lineNumber}` : f.filePath;
}

export function lineLabelOf(f: Pick<Finding, "lineNumber">): string {
  return f.lineNumber != null ? `línea ${f.lineNumber}` : "archivo completo";
}

export function reqLabelOf(f: Pick<Finding, "pciRequirement">): string {
  return `PCI ${f.pciRequirement}`;
}

export function sourceLabelOf(f: Pick<Finding, "source">): string {
  return f.source === "code" ? "CÓDIGO" : "LOG";
}

export function dateStrOf(createdAt: string): string {
  const d = new Date(createdAt);
  return (
    d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) +
    " UTC"
  );
}

export function sortBySeverityDesc<T extends { severity: Severity; createdAt: string }>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => SEV_META[b.severity].rank - SEV_META[a.severity].rank || b.createdAt.localeCompare(a.createdAt)
  );
}

export interface SnippetLine {
  num: number;
  text: string;
  isHighlighted: boolean;
}

export function buildSnippetLines(snippet: string, start: number, highlightLine: number | null): SnippetLine[] {
  return snippet.split("\n").map((text, i) => {
    const num = start + i;
    return {
      num,
      text: text === "" ? " " : text,
      isHighlighted: highlightLine != null && num === highlightLine,
    };
  });
}
