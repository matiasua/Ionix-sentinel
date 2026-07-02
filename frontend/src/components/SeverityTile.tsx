import { Severity } from "../api/client";
import { SEVERITY_LABELS } from "../lib/severity";

export default function SeverityTile({
  severity,
  count,
}: {
  severity: Severity;
  count: number;
}) {
  return (
    <div className={`severity-tile severity-tile--${severity}`}>
      <span className="severity-tile__count">{count}</span>
      <span className="severity-tile__label">{SEVERITY_LABELS[severity]}</span>
    </div>
  );
}
