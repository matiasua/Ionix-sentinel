# Épicas e Historias de Usuario — IONIX Sentinel

> Contexto completo del proyecto en [CLAUDE.md](../CLAUDE.md). Este documento traduce ese alcance en épicas e historias de usuario para backend (Node.js) y frontend (React + TypeScript). Fase 1 = comprometido para la demo. Fase 2 = stretch goal, solo si sobra tiempo.
>
> **Actualizado** con el contrato de datos final de `Finding` y los endpoints definidos en [`07-backend-spec.docs.md`](./07-backend-spec.docs.md) §3/§5 y [`06-frontend-spec.docs.md`](./06-frontend-spec.docs.md) §5, ya reflejados en `backend/src/types/finding.ts`, `frontend/src/api/client.ts` y `backend/src/db/init.sql`. El campo `description` del scaffold original se eliminó — no forma parte del esquema real.

```ts
// Esquema Finding vigente (espejado en frontend y backend)
type Severity = "low" | "medium" | "high" | "critical";
type Source   = "code" | "log";
type Status   = "open" | "acknowledged" | "resolved" | "false_positive";

interface Finding {
  id: string;
  ruleId: string;            // id de la regla que disparó, ej. "SENTINEL-PAN-001"
  pciRequirement: string;    // ej. "3.4"
  title: string;
  severity: Severity;
  source: Source;
  filePath: string;
  lineNumber: number | null;
  snippet: string;
  explanation: string;       // generado por Claude
  remediation: string;       // generado por Claude
  status: Status;
  scanId: string | null;
  createdAt: string;
}
```

---

## Backend (Node.js + PostgreSQL)

### Épica B1 — Analizador Estático de código (Fase 1)
Escanea código/PRs con semgrep + reglas propias PCI-DSS y emite findings crudos en el esquema único.

- **HU-B1.1** — Como developer del sistema, quiero ejecutar semgrep sobre un repositorio o carpeta de código para obtener coincidencias crudas de reglas de seguridad.
  - Criterios de aceptación:
    - Se puede invocar el análisis pasando una ruta de código como parámetro.
    - El resultado de semgrep se captura y parsea (no se descarta stdout/stderr sin revisar).
    - Falla de forma controlada si semgrep no está instalado o el path no existe.
  - Servicio backend: `analysis/runner.ts` (invoca semgrep como subproceso con `--json`).

- **HU-B1.2** — Como responsable de compliance, quiero que existan 10-12 reglas PCI-DSS propias bien definidas (ej. PAN sin cifrar, credenciales hardcodeadas, logging de datos sensibles), para cubrir los requisitos más críticos del estándar en el lenguaje elegido.
  - Criterios de aceptación:
    - Cada regla tiene un `id` único (pasa a poblar `Finding.ruleId`) y su `pciRequirement` asociado.
    - Las reglas están documentadas (qué detectan, qué patrón buscan) en `rules/pci-rules.yaml`.
    - Se prioriza profundidad en un solo lenguaje sobre cobertura superficial multi-lenguaje.
  - Servicio backend: `rules/pci-rules.yaml` + `rules/loader.ts` (carga y valida el YAML al arrancar).

- **HU-B1.3** — Como sistema, quiero validar con el algoritmo de Luhn cualquier coincidencia de "posible número de tarjeta" antes de emitirla como hallazgo, para evitar falsos positivos masivos.
  - Criterios de aceptación:
    - Un número que matchea el regex de PAN pero no pasa Luhn no genera finding.
    - Existe un test con números válidos e inválidos conocidos.
  - Servicio backend: `analysis/luhn.ts`.

- **HU-B1.4** — Como sistema, quiero emitir cada coincidencia en el único esquema JSON de "finding crudo" (independiente de si viene de código o de logs), para que el resto del pipeline no tenga que distinguir el origen.
  - Criterios de aceptación:
    - El finding crudo incluye: `ruleId`, `pciRequirement`, `title`, `severity` (base de la regla), `source` (`code`/`log`), `filePath`, `lineNumber`, `snippet` — sin `explanation`/`remediation`/`status`/`scanId` todavía (esos los agregan las etapas siguientes).
    - El mismo tipo de dato (`CreateFindingInput` en `backend/src/types/finding.ts`) se usa sin importar la fuente del hallazgo.
  - Servicio backend: `analysis/mapper.ts` (normaliza cada match de semgrep/regex al finding crudo).

- **HU-B1.5** — Como PM, quiero poder correr el analizador contra un repo de ejemplo con vulnerabilidades sembradas, para tener un caso de demo reproducible.
  - Criterios de aceptación:
    - Existe un repo/carpeta de prueba (`../Ionix-sentinel-demo`, rama `pci-vulnerable-demo`) con `findings-expected.json` (12 violaciones reales + 3 controles negativos).
    - Correr el analizador contra ese repo produce los `real_violations` esperados y ningún `negative_control` como falso positivo.

### Épica B2 — Motor de Razonamiento con Claude API (Fase 1)
Toma un finding crudo + snippet de contexto y devuelve severidad final, explicación y remediación. Claude nunca decide si algo es una violación, solo enriquece.

- **HU-B2.1** — Como sistema, quiero enviar un finding crudo junto con su `snippet` a la Claude API (Sonnet) y recibir un JSON estructurado con `pciRequirement`, `severity`, `explanation` y `remediation`.
  - Criterios de aceptación:
    - El prompt deja explícito que el finding ya fue determinado por el motor de reglas — Claude solo enriquece, no decide si es o no una violación.
    - La respuesta esperada sigue el schema fijo documentado en `07-backend-spec.docs.md` §4 (etapa 3).
  - Servicio backend: `reasoning/client.ts` (cliente `@anthropic-ai/sdk`) + `reasoning/prompt.ts`.

- **HU-B2.2** — Como sistema, quiero parsear la respuesta de Claude de forma defensiva (buscando el bloque JSON dentro del texto, no asumiendo que la respuesta completa es JSON), para tolerar texto adicional antes/después del JSON.
  - Criterios de aceptación:
    - Si Claude agrega prosa antes o después del JSON, el parseo lo extrae igual.
    - Si el parseo falla o el JSON no matchea el schema, el finding se guarda con `reasoningStatus: "error"` en vez de romper el pipeline completo.
  - Servicio backend: `reasoning/parse.ts`.

- **HU-B2.3** — Como sistema, quiero validar toda salida de Claude contra un schema antes de guardarla en Postgres, para nunca persistir enriquecimientos malformados.
  - Criterios de aceptación:
    - Existe una validación de schema (tipos, campos requeridos, `severity` dentro de los 4 valores válidos) previa al insert.
    - Un finding que no pasa validación se guarda igual (no rompe el pipeline) pero con `reasoningStatus: "error"`, quedando visible como pendiente de revisión.
  - Servicio backend: `reasoning/parse.ts` (mismo módulo que HU-B2.2).

### Épica B3 — API y persistencia de hallazgos (Fase 1)
Expone los findings enriquecidos al frontend y persiste todo en PostgreSQL con el esquema único de `Finding`.

- **HU-B3.1** — Como frontend, quiero un endpoint que liste todos los hallazgos con sus datos enriquecidos, con filtros, para poblar el dashboard y la lista de findings.
  - Criterios de aceptación:
    - `GET /api/findings` devuelve la lista completa en JSON, ordenada por severidad desc.
    - Soporta filtros combinables por query params: `?severity=&source=&status=&scanId=`.
  - Servicio backend: `routes/findings.routes.ts` (ya existe — extender con query params).

- **HU-B3.2** — Como frontend, quiero un endpoint de detalle de un hallazgo específico, para mostrar `filePath`, `lineNumber`, `snippet`, `explanation` y `remediation` completos en la vista de detalle.
  - Criterios de aceptación:
    - `GET /api/findings/:id` devuelve el hallazgo completo o 404 si no existe.
  - Servicio backend: `routes/findings.routes.ts` (nuevo handler `GET /api/findings/:id`).

- **HU-B3.3** — Como sistema, quiero persistir cada finding crudo y su enriquecimiento en PostgreSQL con un esquema único sin importar el origen, para que el dashboard y el risk score se calculen sobre una sola fuente de verdad.
  - Criterios de aceptación:
    - La tabla `findings` cubre campos crudos (`rule_id`, `file_path`, `line_number`, `snippet`) + campos de enriquecimiento (`explanation`, `remediation`, `reasoning_status`) + estado (`status`, `scan_id`).
    - Insertar un finding de código y uno de log (cuando exista Fase 2) usa la misma tabla/esquema.
  - Estado: **hecho** — ver `backend/src/db/init.sql` y `backend/src/db/migrations/002_finding_contract.sql`.

- **HU-B3.4** — Como responsable de compliance, quiero un endpoint que devuelva el resumen de una corrida de análisis (risk score + conteo por severidad), para ver de un vistazo el estado de cumplimiento de ese scan.
  - Criterios de aceptación:
    - `GET /api/scans/:id` devuelve `{ scanId, riskScore, countsBySeverity: { critical, high, medium, low }, findingsCount }`.
    - Fórmula documentada tal cual (no es ML): `riskScore = 10*critical + 5*high + 2*medium + 1*low`.
    - Nivel de color derivado del score: `0` = verde, `1–9` = amarillo, `10+` = rojo.
  - Servicio backend: `routes/scan.routes.ts` (nuevo).

- **HU-B3.5** — Como responsable de compliance, quiero poder cambiar el estado de un hallazgo (`acknowledged`, `resolved`, `false_positive`), para reflejar en el dashboard qué ya fue atendido o descartado.
  - Criterios de aceptación:
    - `PATCH /api/findings/:id` recibe `{ status }`, valida que sea uno de los 4 valores permitidos y devuelve el finding actualizado.
    - Un `status` inválido devuelve 400 sin tocar el registro.
  - Servicio backend: `routes/findings.routes.ts` (nuevo handler `PATCH /api/findings/:id`).

- **HU-B3.6** — Como sistema, quiero disparar el pipeline completo (analizador → motor de razonamiento → persistencia) con un solo trigger, para poder correr la demo en vivo sin pasos manuales.
  - Criterios de aceptación:
    - `POST /api/scan` con body `{ "path": "../Ionix-sentinel-demo" }` ejecuta el flujo end-to-end y devuelve `{ scanId, findingsCount, riskScore }` al finalizar.
    - Los findings quedan disponibles inmediatamente vía `GET /api/findings?scanId=...`.
  - Servicio backend: `routes/scan.routes.ts` (mismo módulo que HU-B3.4).

### Épica B4 — Analizador de Logs (Fase 2, stretch)
Reutiliza el motor de reglas del Analizador Estático aplicado a logs, sin construirlo desde cero. El esquema de salida es el mismo `Finding` (con `source: "log"`, `filePath` apuntando al archivo de log y `lineNumber` a la línea del log).

- **HU-B4.1** — Como sistema, quiero aplicar las mismas reglas PCI-DSS (o un subconjunto adaptado) sobre líneas de log, para detectar fugas de datos sensibles en producción.
  - Criterios de aceptación:
    - Reutiliza el mismo motor de reglas (`rules/pci-rules.yaml`) y el mismo esquema `Finding` que el Analizador Estático.
    - No se implementa un motor de reglas paralelo.

- **HU-B4.2** — Como sistema, quiero correlacionar un finding de log con el código que originó ese log haciendo grep del string literal del log sobre el repo, para dar trazabilidad código↔log.
  - Criterios de aceptación:
    - Dado un log con un mensaje literal, el sistema encuentra el/los archivos de código que contienen ese string.
    - No se implementa nada más sofisticado que ese grep para el MVP (según lo acordado).

- **HU-B4.3** — Como sistema, quiero detectar anomalías simples en logs (ej. umbral de repeticiones de un mismo error), usando reglas de umbral explícitas, dejando claro que no es ML real.
  - Criterios de aceptación:
    - La lógica de "anomalía" es una regla de umbral simple y documentada como tal.
    - Si se muestra en la demo, se aclara explícitamente que no es detección con ML.

---

## Frontend (React + TypeScript)

> Componentes de referencia (inventario completo en [`06-frontend-spec.docs.md`](./06-frontend-spec.docs.md) §3, ya prototipados en `frontend/design/`): `RiskScoreGauge`, `SeverityBadge`, `SeverityTile`, `FindingsTable`/`FindingCard`, `FilterBar`, `ScanButton`, `CodeSnippet`, `StatusSelect`, `EmptyState`/`ErrorState`/`LoadingState`.

### Épica F1 — Dashboard de Compliance: listado y risk score (Fase 1)
Vista principal con todos los hallazgos y el estado agregado de cumplimiento.

- **HU-F1.1** — Como responsable de compliance, quiero ver una tabla/lista con todos los hallazgos (severidad, requisito PCI-DSS, regla, `filePath:lineNumber`, estado), para tener visibilidad general del riesgo.
  - Criterios de aceptación:
    - La vista consume `GET /api/findings` vía `frontend/src/api/client.ts`.
    - Cada fila muestra al menos `severity`, `pciRequirement`, `ruleId`, `filePath:lineNumber` y `status`.
  - Integración frontend: `FindingsTable` / `FindingCard` (tabla en desktop, cards en angosto).

- **HU-F1.2** — Como responsable de compliance, quiero ver un indicador de risk score agregado del último scan en la parte superior del dashboard, para entender el estado general sin tener que leer cada hallazgo.
  - Criterios de aceptación:
    - Consume `GET /api/scans/:id` para el `scanId` más reciente.
    - Muestra 4 tiles con el conteo por severidad (`critical`/`high`/`medium`/`low`) además del score.
  - Integración frontend: `RiskScoreGauge` + `SeverityTile` (×4).

- **HU-F1.3** — Como responsable de compliance, quiero identificar visualmente la severidad de cada hallazgo, para priorizar qué atender primero.
  - Criterios de aceptación:
    - Colores consistentes en toda la app: `critical` rojo, `high` naranja, `medium` amarillo/ámbar, `low` azul/gris (contraste AA).
  - Integración frontend: `SeverityBadge`.

### Épica F2 — Detalle de hallazgo (Fase 1)
Vista dedicada a un hallazgo individual con toda la información enriquecida por Claude.

- **HU-F2.1** — Como responsable de compliance, quiero hacer click en un hallazgo de la lista y ver su detalle completo (`snippet` con la línea resaltada, `explanation`, `remediation`), para entender el problema y cómo resolverlo.
  - Criterios de aceptación:
    - Navega a una vista de detalle que consume `GET /api/findings/:id`.
    - El snippet se muestra en bloque monoespaciado con `lineNumber` resaltado; se listan `pciRequirement`, `ruleId` y `filePath:lineNumber`.
  - Integración frontend: `CodeSnippet`.

- **HU-F2.2** — Como responsable de compliance, quiero volver fácilmente del detalle al listado, para revisar varios hallazgos en secuencia sin perder el contexto de filtros aplicados.
  - Criterios de aceptación:
    - Existe navegación de vuelta (botón/breadcrumb) que preserva filtros previamente aplicados.

- **HU-F2.3** — Como responsable de compliance, quiero cambiar el estado de un hallazgo (`acknowledged`, `resolved`, `false_positive`) desde su detalle, para llevar registro de qué ya fue atendido.
  - Criterios de aceptación:
    - Llama a `PATCH /api/findings/:id` y refleja el nuevo `status` sin recargar toda la página.
    - Un error de la API se muestra de forma clara (no falla silenciosamente).
  - Integración frontend: `StatusSelect`.

### Épica F3 — Filtros y búsqueda (Fase 1)
Permite acotar la lista de hallazgos para focalizar la revisión.

- **HU-F3.1** — Como responsable de compliance, quiero filtrar hallazgos por severidad, para enfocarme primero en los críticos/altos.
  - Criterios de aceptación:
    - El filtro llama a `GET /api/findings?severity=...`.

- **HU-F3.2** — Como responsable de compliance, quiero filtrar hallazgos por requisito PCI-DSS, para revisar el cumplimiento de un requisito específico.
  - Criterios de aceptación:
    - El filtro combina correctamente con los demás (todos aplicados a la vez si corresponde).

- **HU-F3.3** — Como responsable de compliance, quiero filtrar hallazgos por fuente (`code`/`log`), para distinguir hallazgos de código de los de logs (Fase 2).
  - Criterios de aceptación:
    - El filtro llama a `GET /api/findings?source=...` y combina con los demás filtros.

- **HU-F3.4** — Como responsable de compliance, quiero filtrar hallazgos por estado (`open`/`acknowledged`/`resolved`/`false_positive`), para ver solo lo pendiente o solo lo ya atendido.
  - Criterios de aceptación:
    - El filtro llama a `GET /api/findings?status=...` y combina con los demás filtros.
  - Integración frontend (F3.1–F3.4): `FilterBar` único, con los 4 filtros combinables.

### Épica F4 — Disparo de análisis desde la UI (Fase 1)
Permite correr la demo en vivo sin usar la terminal.

- **HU-F4.1** — Como PM, quiero un botón en el dashboard que dispare un nuevo escaneo, para mostrar el flujo completo en vivo durante la demo.
  - Criterios de aceptación:
    - El botón llama a `POST /api/scan` y muestra un estado "escaneando..." mientras corre.
    - Al finalizar (`{ scanId, findingsCount, riskScore }`), el listado (`GET /api/findings?scanId=...`) y el risk score (`GET /api/scans/:id`) se refrescan automáticamente.
  - Integración frontend: `ScanButton`.

- **HU-F4.2** — Como PM, quiero ver los 4 estados de la UI (loading/empty/scanning/error) con datos reales, para que la demo sea legible para la audiencia y no se rompa si la API falla.
  - Criterios de aceptación:
    - **Loading**: mientras se consulta `GET /api/findings` o `GET /api/scans/:id`.
    - **Empty**: aún no hay findings (antes del primer scan) — CTA "Escanear repo".
    - **Scanning**: spinner/progreso en `ScanButton` mientras corre `POST /api/scan`.
    - **Error**: la API falló — mensaje claro, no pantalla en blanco.
  - Integración frontend: `EmptyState` / `ErrorState` / `LoadingState`.

### Épica F5 — Trazabilidad código↔log (Fase 2, stretch)
Vista que conecta un hallazgo de log con el código que lo originó.

- **HU-F5.1** — Como responsable de compliance, quiero ver, dentro del detalle de un hallazgo de log, el archivo de código correlacionado que generó ese log, para entender el origen real del problema.
  - Criterios de aceptación:
    - Si el backend devuelve una correlación código↔log, se muestra en la vista de detalle.
    - Si no hay correlación encontrada, se indica explícitamente en vez de dejar la sección vacía sin explicación.

---

## Fuera de alcance para Fase 1 (visto en el prototipo de diseño)

El bundle de Claude Design (`frontend/design/`) incluyó más vistas que el brief original de 3 (ver `frontend/design/README.md`): **Configuración → Reglas** (gestión del motor de reglas dinámico) y **Configuración → Repositorios** (selección de repos a analizar). Son prototipos visuales válidos para una fase futura, pero **no generan historias de Fase 1**:

- Editar reglas PCI-DSS vía UI no es necesario para la demo — las reglas viven en `rules/pci-rules.yaml` y se editan directamente en el archivo (HU-B1.2).
- Seleccionar repos vía UI no es necesario — el path se pasa directo en `POST /api/scan` (HU-B3.6/F4.1), hardcodeado al repo de demo si hace falta.

Si sobra tiempo después de que **todo** lo de Fase 1 (y eventualmente Fase 2 de logs) esté sólido, recién ahí se justifica abrir épicas para estas dos vistas — nunca antes, según la regla dura de `CLAUDE.md`: *"si hay que elegir entre pulir Fase 1 o avanzar Fase 2, siempre gana pulir Fase 1"*.

---

## Notas de priorización
- Todo lo marcado **Fase 1** debe funcionar de punta a punta antes de tocar cualquier historia de **Fase 2**.
- El contrato de datos (`Finding` de arriba) es la **frontera** entre frontend y backend: si cambia, avisar antes de mergear (regla de `06-frontend-spec.docs.md` §5).
- No hay épicas de autenticación, multi-usuario ni pulido visual — están explícitamente fuera de alcance según [CLAUDE.md](../CLAUDE.md).
- Ir registrando durante el desarrollo qué historias se resolvieron con ayuda directa de Claude Code y cuánto tiempo ahorraron — pesa 30 pts en la evaluación del hackathon.
