# 06 · Frontend — Especificación del Dashboard de Compliance

> Especificación del **producto** frontend (el dashboard del pitch) y **brief para construirlo con Claude Design**. La base React+Vite actual está descrita en [`02-frontend.docs.md`](./02-frontend.docs.md); esta spec la extiende.
>
> **Stack:** React + TypeScript + Vite. El diseño visual se genera con **Claude Design**; esta doc define qué vistas, componentes, datos y estados debe producir para que calce con el backend ([`07-backend-spec.docs.md`](./07-backend-spec.docs.md)).

## 1. Qué es el frontend

Un **dashboard de compliance PCI-DSS**: muestra los hallazgos (findings) detectados por el analizador, su risk score agregado, y para cada uno la explicación + remediación que generó Claude. Es lo que se ve en la demo (slide 9 del pitch): *finding detectado → mapeado a requisito PCI-DSS → remediación de Claude → aparece con su risk score.*

No hay login ni multi-usuario (fuera de alcance del hackathon). El foco es que la demo se vea creíble y funcione en vivo.

## 2. Vistas (3)

### Vista A — Dashboard principal (home)
El "resumen ejecutivo". Lo primero que ve el jurado.
- **Risk score** grande y prominente (número + nivel de color; fórmula en §5 del backend).
- **Conteo por severidad**: 4 tiles (critical / high / medium / low) con su número.
- **Botón "Escanear repo"** → dispara `POST /api/scan` (para la demo, escanea el repo de práctica).
- **Lista de findings recientes** (top 5–10), ordenados por severidad.

### Vista B — Lista de findings
Todos los hallazgos, con filtros.
- Tabla/lista ordenada por severidad desc.
- **Barra de filtros**: severidad, fuente (`code`/`log`), estado, requisito PCI-DSS.
- Cada fila: badge de severidad, título, requisito PCI-DSS, `archivo:línea`, estado. Click → detalle.

### Vista C — Detalle de finding
El "momento Claude" de la demo.
- Título + badge de severidad + requisito PCI-DSS.
- Ubicación: `filePath:lineNumber`.
- **Snippet** de código (bloque monoespaciado, con la línea del hallazgo resaltada).
- **Explicación** (de Claude) — por qué es una violación.
- **Remediación** (de Claude) — cómo corregirlo.
- Acción: cambiar `status` (ej. marcar `acknowledged` / `false_positive`) → `PATCH /api/findings/:id`.

## 3. Inventario de componentes (para Claude Design)

| Componente | Rol |
|---|---|
| `RiskScoreGauge` | Muestra el risk score agregado (número + nivel de color). |
| `SeverityBadge` | Etiqueta de severidad con color consistente (ver §6). |
| `SeverityTile` | Tile de conteo por severidad en el dashboard. |
| `FindingsTable` / `FindingCard` | Lista de findings (tabla en desktop, cards en angosto). |
| `FilterBar` | Filtros por severidad, fuente, estado, requisito. |
| `ScanButton` | Dispara el escaneo; muestra estado "escaneando…". |
| `CodeSnippet` | Bloque de código monoespaciado con línea resaltada. |
| `StatusSelect` | Cambia el estado de un finding. |
| `EmptyState` / `ErrorState` / `LoadingState` | Estados de la UI (ver §4). |

## 4. Estados de UI (obligatorios)
Diseñar los 4 estados de cada vista con datos, no solo el "happy path":
- **Loading** — mientras se consulta la API.
- **Empty** — aún no hay findings (antes del primer escaneo). CTA: "Escanear repo".
- **Scanning** — escaneo en curso (spinner/progreso en el `ScanButton`).
- **Error** — la API falló (mostrar mensaje claro, no pantalla en blanco).

## 5. Contrato de datos (espeja el backend)

El frontend consume el esquema `Finding` definido en [`07-backend-spec.docs.md`](./07-backend-spec.docs.md) §3. Los tipos viven en `frontend/src/api/client.ts` y **deben espejar** los del backend (`backend/src/types/finding.ts`). El contrato de la API es la **frontera** entre frontend y backend: si cambia el modelo, avisar antes de mergear.

```ts
// frontend/src/api/client.ts (espejo del backend)
type Severity = "low" | "medium" | "high" | "critical";
type Source   = "code" | "log";
type Status   = "open" | "acknowledged" | "resolved" | "false_positive";

interface Finding {
  id: string;
  ruleId: string;
  pciRequirement: string;   // "3.5.1"
  title: string;
  severity: Severity;
  source: Source;
  filePath: string;
  lineNumber: number | null;
  snippet: string;
  explanation: string;      // Claude
  remediation: string;      // Claude
  status: Status;
  scanId: string;
  createdAt: string;
}
```

Endpoints que consume (detalle en backend §5):
`GET /api/findings?severity=&source=&status=` · `GET /api/findings/:id` · `PATCH /api/findings/:id` · `POST /api/scan` · `GET /api/scans/:id`.

**Config:** `VITE_API_URL` apunta a `http://localhost:3000` (el navegador corre fuera de la red Docker — no usar `backend:3000`).

## 6. Lineamientos visuales

Contexto: **fintech / seguridad transaccional** → serio, claro, legible. Sin adornos innecesarios.

**Colores de severidad** (consistentes en toda la app):
| Severidad | Color sugerido |
|---|---|
| `critical` | rojo |
| `high` | naranja |
| `medium` | amarillo/ámbar |
| `low` | azul/gris |

Requisitos: accesible (contraste AA), responsive (tabla → cards en móvil), funciona en claro y oscuro si es fácil. Recuerda: *funcionar en vivo pesa más que verse perfecto.*

> Al construir con Claude Design, apóyate en las skills `artifact-design` (fundamentos) y `dataviz` (para el risk score / tiles / cualquier gráfico). Usa la **paleta como sistema**, no colores sueltos.

## 7. Flujo de trabajo con Claude Design → app Vite

1. **Genera con Claude Design** cada vista/componente usando **datos mock que respeten el esquema `Finding`** de §5 (así el diseño ya calza con el backend real).
2. El output de Claude Design es React (+ CSS/estilos). **Pórtalo** a `frontend/src/` como componentes.
3. Reemplaza los datos mock por llamadas reales vía `frontend/src/api/client.ts`.
4. Mantén el **contrato de datos como frontera** — no cambies los nombres de campos sin avisar al backend.
5. Prueba el flujo end-to-end: `POST /api/scan` sobre el repo demo → findings en la lista → detalle con remediación → risk score en el dashboard.

## 8. Definición de "listo" para la demo
- [ ] Dashboard muestra risk score real + conteos por severidad.
- [ ] Lista de findings con al menos filtro por severidad.
- [ ] Detalle muestra snippet + explicación + remediación de Claude.
- [ ] Botón de escaneo funciona sobre `../Ionix-sentinel-demo`.
- [ ] Los 4 estados (loading/empty/scanning/error) no rompen la UI.

## 9. Épicas relacionadas
Ver [`epicas-historias.md`](./epicas-historias.md): frontend (dashboard, lista, detalle, risk score).
