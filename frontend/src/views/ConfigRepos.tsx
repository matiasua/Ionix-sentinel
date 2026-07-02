import { repos } from "../mocks/repos";

export function ConfigRepos({
  activeRepo,
  totalFindings,
  onSelectRepo,
  onAddRepo,
}: {
  activeRepo: string;
  totalFindings: number;
  onSelectRepo: (value: string) => void;
  onAddRepo: () => void;
}) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Repositorios</h1>
          <p>{repos.length} repositorios conectados</p>
        </div>
        <button className="btn btn-outline-dashed" onClick={onAddRepo}>
          + Agregar repositorio
        </button>
      </div>
      <div className="repo-grid" style={{ marginTop: 20 }}>
        {repos.map((r) => {
          const isActive = r.value === activeRepo;
          return (
            <div key={r.value} className="repo-card" style={{ borderColor: isActive ? "rgba(255,107,26,0.4)" : undefined }}>
              <div className="repo-card__head">
                <div className="repo-card__name">
                  <svg width="17" height="17" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M4.5 2.5h6l3 3v10h-9z" stroke="#FF8B4D" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M10.5 2.5v3h3" stroke="#FF8B4D" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                  <span>{r.name}</span>
                </div>
                {isActive && <span className="badge-active">ACTIVO</span>}
              </div>
              <div className="repo-card__meta">
                <span>rama {r.branch}</span>
                <span>{isActive ? `${totalFindings} hallazgos` : "sin escanear"}</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: "rgba(245,241,237,0.4)" }}>
                Último escaneo · {r.lastScan}
              </span>
              <button
                disabled={isActive}
                onClick={() => !isActive && onSelectRepo(r.value)}
                style={{
                  marginTop: 2,
                  alignSelf: "flex-start",
                  background: isActive ? "rgba(255,107,26,0.14)" : "transparent",
                  color: isActive ? "#FF8B4D" : "#F5F1ED",
                  border: `1px solid ${isActive ? "rgba(255,107,26,0.4)" : "rgba(255,255,255,0.22)"}`,
                  borderRadius: 999,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isActive ? "default" : "pointer",
                }}
              >
                {isActive ? "Seleccionado" : "Seleccionar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
