import type { Severity } from "../../api/client";
import { SEV_META } from "../../theme";

export function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = SEV_META[severity];
  return (
    <span className="severity-badge" style={{ color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  );
}
