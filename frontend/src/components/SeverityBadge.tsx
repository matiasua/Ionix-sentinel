import { Severity } from "../api/client";
import { SEVERITY_LABELS } from "../lib/severity";

export default function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge badge--severity-${severity}`}>
      {SEVERITY_LABELS[severity]}
    </span>
  );
}
