import type { Finding, Severity } from "../api/client";
import { FilterBar } from "../components/ui/FilterBar";
import { SeverityBadge } from "../components/ui/SeverityBadge";
import { locationOf, reqLabelOf, sortBySeverityDesc, sourceLabelOf } from "../utils/findings";

export function FindingsList({
  findings,
  severityFilter,
  onSeverityFilterChange,
  requirementFilter,
  onRequirementFilterChange,
  onOpenFinding,
  onScan,
  narrow,
}: {
  findings: Finding[];
  severityFilter: Severity | "all";
  onSeverityFilterChange: (value: Severity | "all") => void;
  requirementFilter: string;
  onRequirementFilterChange: (value: string) => void;
  onOpenFinding: (id: string) => void;
  onScan: () => void;
  narrow: boolean;
}) {
  const isEmpty = findings.length === 0;
  const requirementOptions = [...new Set(findings.map((f) => f.pciRequirement))].sort();
  const sorted = sortBySeverityDesc(findings);
  const filtered = sorted.filter(
    (f) =>
      (severityFilter === "all" || f.severity === severityFilter) &&
      (requirementFilter === "all" || f.pciRequirement === requirementFilter)
  );
  const hasFilters = severityFilter !== "all" || requirementFilter !== "all";
  const noFilterResults = !isEmpty && filtered.length === 0;

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.01em" }}>Hallazgos</h1>
        <p style={{ margin: 0, color: "var(--text-dim)", fontSize: 14.5 }}>
          {filtered.length} de {findings.length} hallazgos · ordenados por severidad
        </p>
      </div>

      {!isEmpty && (
        <FilterBar
          severity={severityFilter}
          onSeverityChange={onSeverityFilterChange}
          requirement={requirementFilter}
          onRequirementChange={onRequirementFilterChange}
          requirementOptions={requirementOptions}
          hasFilters={hasFilters}
          onClear={() => {
            onSeverityFilterChange("all");
            onRequirementFilterChange("all");
          }}
        />
      )}

      {isEmpty && (
        <div className="state-box state-box--empty" style={{ padding: "56px 32px", marginTop: 20 }}>
          <h3 style={{ fontSize: 17 }}>Aún no hay hallazgos</h3>
          <p>Ejecuta un escaneo desde el resumen para poblar esta lista.</p>
          <button className="btn btn-primary" style={{ marginTop: 4 }} onClick={onScan}>
            Escanear repo
          </button>
        </div>
      )}

      {noFilterResults && (
        <div className="state-box state-box--empty" style={{ padding: "48px 32px", marginTop: 20 }}>
          <p>Ningún hallazgo coincide con los filtros actuales.</p>
          <button
            className="btn btn-ghost"
            onClick={() => {
              onSeverityFilterChange("all");
              onRequirementFilterChange("all");
            }}
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {!isEmpty && filtered.length > 0 && !narrow && (
        <div className="panel panel--overflow" style={{ marginTop: 20 }}>
          <div className="panel-row-head findings-row-grid">
            <span>SEVERIDAD</span>
            <span>HALLAZGO</span>
            <span style={{ textAlign: "center" }}>REQ.</span>
            <span>UBICACIÓN</span>
          </div>
          {filtered.map((f) => (
            <div key={f.id} className="panel-row findings-row-grid" onClick={() => onOpenFinding(f.id)}>
              <SeverityBadge severity={f.severity} />
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {f.title}
                </span>
                <span className="mono" style={{ fontSize: 11.5, color: "rgba(245,241,237,0.40)" }}>
                  {sourceLabelOf(f)} · {f.ruleId}
                </span>
              </div>
              <span className="pci-badge">{reqLabelOf(f)}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {locationOf(f)}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isEmpty && filtered.length > 0 && narrow && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
          {filtered.map((f) => (
            <div key={f.id} className="finding-card" onClick={() => onOpenFinding(f.id)}>
              <span style={{ alignSelf: "flex-start" }}>
                <SeverityBadge severity={f.severity} />
              </span>
              <span className="finding-card__title">{f.title}</span>
              <div className="finding-card__meta">
                <span className="pci-badge">{reqLabelOf(f)}</span>
                <span>{locationOf(f)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
