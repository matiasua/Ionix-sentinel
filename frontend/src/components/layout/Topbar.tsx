import type { RepoDef } from "../../mocks/repos";

export function Topbar({
  repos,
  repo,
  onRepoChange,
  lastScanLabel,
  showGitBranchSelector,
  gitBranches,
  gitBranch,
  onGitBranchChange,
  gitBranchesLoading,
  gitBranchesError,
}: {
  repos: RepoDef[];
  repo: string;
  onRepoChange: (value: string) => void;
  lastScanLabel: string;
  // Los siguientes props solo se usan cuando repo === "live-scan": ese modo no
  // siembra un catálogo fijo, sino que corre el pipeline real contra una rama
  // GIT REAL de matiasua/Ionix-sentinel elegida acá (dropdown poblado desde
  // GET /api/live-scan/branches, no una lista escrita a mano).
  showGitBranchSelector?: boolean;
  gitBranches?: string[] | null;
  gitBranch?: string;
  onGitBranchChange?: (value: string) => void;
  gitBranchesLoading?: boolean;
  gitBranchesError?: boolean;
}) {
  return (
    <div className="topbar">
      <label className="topbar__label">
        <span>REPOSITORIO</span>
        <select className="select" value={repo} onChange={(e) => onRepoChange(e.target.value)}>
          {repos.map((r) => (
            <option key={r.value} value={r.value}>
              {r.name} · {r.branch}
            </option>
          ))}
        </select>
      </label>

      {showGitBranchSelector && (
        <label className="topbar__label">
          <span>RAMA GIT (Ionix-sentinel)</span>
          {gitBranchesError ? (
            <span className="mono" style={{ fontSize: 12, color: "#FF6B6B" }}>
              No se pudo obtener la lista de ramas
            </span>
          ) : (
            <select
              className="select"
              value={gitBranch ?? ""}
              disabled={gitBranchesLoading || !gitBranches?.length}
              onChange={(e) => onGitBranchChange?.(e.target.value)}
            >
              {gitBranchesLoading && <option value="">Cargando ramas...</option>}
              {!gitBranchesLoading &&
                gitBranches?.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
            </select>
          )}
        </label>
      )}

      <span className="mono" style={{ fontSize: 12, color: "rgba(245,241,237,0.40)" }}>
        {lastScanLabel}
      </span>
    </div>
  );
}
