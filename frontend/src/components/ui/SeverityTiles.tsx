import type { Severity } from "../../api/client";
import { SEV_META } from "../../theme";

const ORDER: Severity[] = ["critical", "high", "medium", "low"];

export function SeverityTiles({
  counts,
  onSelect,
}: {
  counts: Record<Severity, number>;
  onSelect?: (severity: Severity) => void;
}) {
  return (
    <div className="severity-tiles">
      {ORDER.map((key) => {
        const meta = SEV_META[key];
        const count = counts[key];
        return (
          <div
            key={key}
            className="severity-tile"
            onClick={() => onSelect?.(key)}
            role={onSelect ? "button" : undefined}
          >
            <div className="severity-tile__head">
              <span className="dot dot--glow" style={{ background: meta.dot, color: meta.dot }} />
              <span>{meta.tile}</span>
            </div>
            <span className="severity-tile__count" style={{ color: count > 0 ? meta.num : "rgba(245,241,237,0.25)" }}>
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
