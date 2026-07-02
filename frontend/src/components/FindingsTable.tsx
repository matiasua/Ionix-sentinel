import { Finding } from "../api/client";
import { STATUS_LABELS } from "../lib/severity";
import SeverityBadge from "./SeverityBadge";

export default function FindingsTable({
  findings,
  onSelect,
}: {
  findings: Finding[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="findings-table">
      {findings.map((finding) => (
        <button
          key={finding.id}
          type="button"
          className="findings-table__row"
          onClick={() => onSelect(finding.id)}
        >
          <SeverityBadge severity={finding.severity} />
          <span className="findings-table__title">{finding.title}</span>
          <span className="findings-table__pci">PCI {finding.pciRequirement}</span>
          <span className="findings-table__location">
            {finding.filePath}
            {finding.lineNumber ? `:${finding.lineNumber}` : ""}
          </span>
          <span className={`findings-table__status findings-table__status--${finding.status}`}>
            {STATUS_LABELS[finding.status]}
          </span>
        </button>
      ))}
    </div>
  );
}
