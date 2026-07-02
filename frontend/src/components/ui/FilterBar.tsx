import type { Severity } from "../../api/client";

const SEVERITY_OPTIONS: Array<{ value: Severity | "all"; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "critical", label: "Crítica" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

export function FilterBar({
  severity,
  onSeverityChange,
  requirement,
  onRequirementChange,
  requirementOptions,
  hasFilters,
  onClear,
}: {
  severity: Severity | "all";
  onSeverityChange: (value: Severity | "all") => void;
  requirement: string;
  onRequirementChange: (value: string) => void;
  requirementOptions: string[];
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="filter-bar">
      <label className="filter-field">
        <span>SEVERIDAD</span>
        <select
          className="select select--square"
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value as Severity | "all")}
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span>REQUISITO PCI-DSS</span>
        <select className="select select--square" value={requirement} onChange={(e) => onRequirementChange(e.target.value)}>
          <option value="all">Todos</option>
          {requirementOptions.map((req) => (
            <option key={req} value={req}>
              {req}
            </option>
          ))}
        </select>
      </label>
      {hasFilters && (
        <button className="btn btn-ghost" onClick={onClear}>
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
