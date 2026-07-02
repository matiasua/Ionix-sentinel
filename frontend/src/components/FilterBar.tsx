import { FindingFilters, Severity, Source, Status } from "../api/client";
import { SEVERITY_LABELS, STATUS_LABELS } from "../lib/severity";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const SOURCES: Source[] = ["code", "log"];
const STATUSES: Status[] = ["open", "acknowledged", "resolved", "false_positive"];

export default function FilterBar({
  filters,
  onChange,
}: {
  filters: FindingFilters;
  onChange: (filters: FindingFilters) => void;
}) {
  return (
    <div className="filter-bar">
      <select
        value={filters.severity ?? ""}
        onChange={(e) =>
          onChange({ ...filters, severity: (e.target.value || undefined) as Severity | undefined })
        }
      >
        <option value="">Todas las severidades</option>
        {SEVERITIES.map((s) => (
          <option key={s} value={s}>
            {SEVERITY_LABELS[s]}
          </option>
        ))}
      </select>

      <select
        value={filters.source ?? ""}
        onChange={(e) =>
          onChange({ ...filters, source: (e.target.value || undefined) as Source | undefined })
        }
      >
        <option value="">Todas las fuentes</option>
        {SOURCES.map((s) => (
          <option key={s} value={s}>
            {s === "code" ? "Código" : "Logs"}
          </option>
        ))}
      </select>

      <select
        value={filters.status ?? ""}
        onChange={(e) =>
          onChange({ ...filters, status: (e.target.value || undefined) as Status | undefined })
        }
      >
        <option value="">Todos los estados</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      {(filters.severity || filters.source || filters.status) && (
        <button type="button" className="filter-bar__clear" onClick={() => onChange({})}>
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
