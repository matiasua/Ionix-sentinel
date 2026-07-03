import logo from "../../assets/ionix-logo.png";

export type Section = "static" | "logs" | "rules" | "repos";

export function Sidebar({
  section,
  configOpen,
  onNavigate,
  onToggleConfig,
}: {
  section: Section;
  configOpen: boolean;
  onNavigate: (section: Section) => void;
  onToggleConfig: () => void;
}) {
  const isConfig = section === "rules" || section === "repos";
  const open = configOpen || isConfig;

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src={logo} alt="IONIX" />
        <span className="sidebar__divider" />
        <span className="sidebar__title">Sentinel</span>
        <span className="sidebar__pill">PCI</span>
      </div>

      <nav className="sidebar__nav">
        <span className="nav-section-label">MONITOREO</span>

        <button
          className={`nav-item${section === "static" ? " nav-item--active" : ""}`}
          onClick={() => onNavigate("static")}
        >
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="6.2" height="6.2" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
            <rect x="9.8" y="2" width="6.2" height="6.2" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
            <rect x="2" y="9.8" width="6.2" height="6.2" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
            <rect x="9.8" y="9.8" width="6.2" height="6.2" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Dashboard estático
        </button>

        <button className={`nav-item${section === "logs" ? " nav-item--active" : ""}`} onClick={() => onNavigate("logs")}>
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
            <path d="M3 4.2H15 M3 9H15 M3 13.8H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Dashboard dinámico
        </button>

        <span className="nav-section-label" style={{ paddingTop: 14 }}>
          AJUSTES
        </span>

        <button className={`nav-item${isConfig ? " nav-item--active" : ""}`} onClick={onToggleConfig}>
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M9 1.6v2.2M9 14.2v2.2M16.4 9h-2.2M3.8 9H1.6M14.2 3.8l-1.6 1.6M5.4 12.6l-1.6 1.6M14.2 14.2l-1.6-1.6M5.4 5.4L3.8 3.8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Configuración
          <svg
            className="nav-item__chevron"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{ marginLeft: "auto", transform: `rotate(${open ? 180 : 0}deg)` }}
          >
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div className="nav-sub">
            <button
              className={`nav-sub-item${section === "rules" ? " nav-sub-item--active" : ""}`}
              onClick={() => onNavigate("rules")}
            >
              Reglas
            </button>
            <button
              className={`nav-sub-item${section === "repos" ? " nav-sub-item--active" : ""}`}
              onClick={() => onNavigate("repos")}
            >
              Repositorios
            </button>
          </div>
        )}
      </nav>

      <div className="sidebar__status">
        <span className="status-dot" />
        MOTOR ACTIVO
      </div>
    </aside>
  );
}
