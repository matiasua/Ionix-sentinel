import type { RepoDef } from "../../mocks/repos";

export function Topbar({
  repos,
  repo,
  onRepoChange,
  lastScanLabel,
}: {
  repos: RepoDef[];
  repo: string;
  onRepoChange: (value: string) => void;
  lastScanLabel: string;
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
      <span className="mono" style={{ fontSize: 12, color: "rgba(245,241,237,0.40)" }}>
        {lastScanLabel}
      </span>
    </div>
  );
}
