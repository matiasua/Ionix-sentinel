import { useEffect, useState } from "react";
import { Finding, FindingFilters, getFindings } from "../api/client";
import FilterBar from "../components/FilterBar";
import FindingsTable from "../components/FindingsTable";
import { EmptyState, ErrorState, LoadingState } from "../components/UiStates";

type LoadState = "loading" | "ready" | "error";

export default function FindingsListPage({
  onSelectFinding,
}: {
  onSelectFinding: (id: string) => void;
}) {
  const [filters, setFilters] = useState<FindingFilters>({});
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  async function load(currentFilters: FindingFilters) {
    setLoadState("loading");
    try {
      const data = await getFindings(currentFilters);
      setFindings(data);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => {
    load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.severity, filters.source, filters.status]);

  return (
    <div className="findings-list-page">
      <h1>Hallazgos</h1>
      <FilterBar filters={filters} onChange={setFilters} />

      {loadState === "loading" && <LoadingState message="Cargando hallazgos..." />}
      {loadState === "error" && (
        <ErrorState message="No se pudieron cargar los hallazgos." onRetry={() => load(filters)} />
      )}
      {loadState === "ready" && findings.length === 0 && (
        <EmptyState message="No hay hallazgos que coincidan con los filtros." />
      )}
      {loadState === "ready" && findings.length > 0 && (
        <FindingsTable findings={findings} onSelect={onSelectFinding} />
      )}
    </div>
  );
}
