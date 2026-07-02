import { useEffect, useState } from "react";
import { Finding, Status, getFinding, updateFindingStatus } from "../api/client";
import SeverityBadge from "../components/SeverityBadge";
import CodeSnippet from "../components/CodeSnippet";
import StatusSelect from "../components/StatusSelect";
import { ErrorState, LoadingState } from "../components/UiStates";

type LoadState = "loading" | "ready" | "error";

export default function FindingDetailPage({
  findingId,
  onBack,
}: {
  findingId: string;
  onBack: () => void;
}) {
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [updating, setUpdating] = useState(false);

  async function load() {
    setLoadState("loading");
    try {
      const data = await getFinding(findingId);
      setFinding(data);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findingId]);

  async function handleStatusChange(status: Status) {
    if (!finding) return;
    setUpdating(true);
    try {
      const updated = await updateFindingStatus(finding.id, status);
      setFinding(updated);
    } catch {
      setLoadState("error");
    } finally {
      setUpdating(false);
    }
  }

  if (loadState === "loading") {
    return <LoadingState message="Cargando hallazgo..." />;
  }

  if (loadState === "error" || !finding) {
    return <ErrorState message="No se pudo cargar el hallazgo." onRetry={load} />;
  }

  return (
    <div className="finding-detail-page">
      <button type="button" className="finding-detail-page__back" onClick={onBack}>
        ← Volver a hallazgos
      </button>

      <header className="finding-detail-page__header">
        <SeverityBadge severity={finding.severity} />
        <h1>{finding.title}</h1>
        <div className="finding-detail-page__meta">
          PCI {finding.pciRequirement} · Regla {finding.ruleId} ·{" "}
          {finding.filePath}
          {finding.lineNumber ? `:${finding.lineNumber}` : ""}
        </div>
      </header>

      <section>
        <h2>Snippet</h2>
        <CodeSnippet
          ruleId={finding.ruleId}
          snippet={finding.snippet}
          lineNumber={finding.lineNumber}
        />
      </section>

      <section>
        <h2>Explicación</h2>
        <p>{finding.explanation || "Sin explicación disponible."}</p>
      </section>

      <section>
        <h2>Remediación</h2>
        <p>{finding.remediation || "Sin remediación disponible."}</p>
      </section>

      <section className="finding-detail-page__status">
        <h2>Estado</h2>
        <StatusSelect status={finding.status} onChange={handleStatusChange} disabled={updating} />
      </section>
    </div>
  );
}
