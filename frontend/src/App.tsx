import { useEffect, useState } from "react";
import {
  Finding,
  Severity,
  Source,
  createFinding,
  getFindings,
  getHealth,
} from "./api/client";

type BackendStatus = "loading" | "ok" | "error";

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];
const SOURCES: Source[] = ["code", "log"];

const EMPTY_FORM = {
  title: "",
  description: "",
  severity: "medium" as Severity,
  pciRequirement: "",
  source: "code" as Source,
};

export default function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("loading");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadHealth() {
    try {
      await getHealth();
      setBackendStatus("ok");
    } catch {
      setBackendStatus("error");
    }
  }

  async function loadFindings() {
    try {
      const data = await getFindings();
      setFindings(data);
    } catch {
      setError("No se pudieron cargar los findings.");
    }
  }

  useEffect(() => {
    loadHealth();
    loadFindings();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.title || !form.description || !form.pciRequirement) {
      setError("Completa todos los campos.");
      return;
    }

    setSubmitting(true);
    try {
      await createFinding(form);
      setForm(EMPTY_FORM);
      await loadFindings();
    } catch {
      setError("No se pudo crear el finding.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>IONIX Sentinel</h1>
        <p>Detección temprana de riesgos PCI-DSS en código y logs</p>
      </header>

      <div className={`status status--${backendStatus}`}>
        {backendStatus === "loading" && "Consultando backend..."}
        {backendStatus === "ok" && "Backend conectado"}
        {backendStatus === "error" && "Backend no disponible"}
      </div>

      <section>
        <h2>Nuevo finding</h2>
        <form className="finding-form" onSubmit={handleSubmit}>
          <input
            placeholder="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            placeholder="Descripción"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            value={form.severity}
            onChange={(e) =>
              setForm({ ...form, severity: e.target.value as Severity })
            }
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            placeholder="Requisito PCI-DSS (ej: 6.5.1)"
            value={form.pciRequirement}
            onChange={(e) => setForm({ ...form, pciRequirement: e.target.value })}
          />
          <select
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value as Source })}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" disabled={submitting}>
            {submitting ? "Creando..." : "Crear finding"}
          </button>
        </form>
        {error && <p style={{ color: "#fca5a5" }}>{error}</p>}
      </section>

      <section>
        <h2>Findings registrados</h2>
        {findings.length === 0 && <p>No hay findings todavía.</p>}
        <ul className="findings-list">
          {findings.map((finding) => (
            <li key={finding.id} className="finding-card">
              <div className="finding-card__header">
                <strong>{finding.title}</strong>
                <span className={`severity-badge severity-${finding.severity}`}>
                  {finding.severity}
                </span>
              </div>
              <p>{finding.description}</p>
              <div className="finding-card__meta">
                PCI: {finding.pciRequirement} · Fuente: {finding.source} ·{" "}
                {new Date(finding.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
