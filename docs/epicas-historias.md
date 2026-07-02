# Épicas e Historias de Usuario — IONIX Sentinel

> Contexto completo del proyecto en [CLAUDE.md](../CLAUDE.md). Este documento traduce ese alcance en épicas e historias de usuario para backend (Node.js) y frontend (React + TypeScript). Fase 1 = comprometido para la demo. Fase 2 = stretch goal, solo si sobra tiempo.

---

## Backend (Node.js + PostgreSQL)

### Épica B1 — Analizador Estático de código (Fase 1)
Escanea código/PRs con semgrep + reglas propias PCI-DSS y emite findings crudos en el esquema único.

- **HU-B1.1** — Como developer del sistema, quiero ejecutar semgrep sobre un repositorio o carpeta de código para obtener coincidencias crudas de reglas de seguridad.
  - Criterios de aceptación:
    - Se puede invocar el análisis pasando una ruta de código como parámetro.
    - El resultado de semgrep se captura y parsea (no se descarta stdout/stderr sin revisar).
    - Falla de forma controlada si semgrep no está instalado o el path no existe.

- **HU-B1.2** — Como responsable de compliance, quiero que existan 10-12 reglas PCI-DSS propias bien definidas (ej. PAN sin cifrar, credenciales hardcodeadas, logging de datos sensibles), para cubrir los requisitos más críticos del estándar en el lenguaje elegido.
  - Criterios de aceptación:
    - Cada regla tiene un identificador único y su requisito PCI-DSS asociado.
    - Las reglas están documentadas (qué detectan, qué patrón buscan).
    - Se prioriza profundidad en un solo lenguaje sobre cobertura superficial multi-lenguaje.

- **HU-B1.3** — Como sistema, quiero validar con el algoritmo de Luhn cualquier coincidencia de "posible número de tarjeta" antes de emitirla como hallazgo, para evitar falsos positivos masivos.
  - Criterios de aceptación:
    - Un número que matchea el regex de PAN pero no pasa Luhn no genera finding.
    - Existe un test con números válidos e inválidos conocidos.

- **HU-B1.4** — Como sistema, quiero emitir cada coincidencia en un único esquema JSON de "finding crudo" (independiente de si viene de código o de logs), para que el resto del pipeline no tenga que distinguir el origen.
  - Criterios de aceptación:
    - El esquema incluye al menos: id, origen (código/log), regla/requisito PCI-DSS, archivo o fuente, línea/contexto, snippet.
    - El mismo tipo de dato se usa sin importar la fuente del hallazgo.

- **HU-B1.5** — Como PM, quiero poder correr el analizador contra un repo de ejemplo con vulnerabilidades sembradas, para tener un caso de demo reproducible.
  - Criterios de aceptación:
    - Existe un repo/carpeta de prueba con al menos un caso positivo por regla.
    - Correr el analizador contra ese repo produce findings esperados y ningún falso positivo evidente.

### Épica B2 — Motor de Razonamiento con Claude API (Fase 1)
Toma un finding crudo + snippet de contexto y devuelve severidad, explicación y remediación. Claude nunca decide si algo es una violación, solo enriquece.

- **HU-B2.1** — Como sistema, quiero enviar un finding crudo junto con su snippet de código a la Claude API y recibir un JSON estructurado con requisito PCI-DSS, severidad, explicación y remediación.
  - Criterios de aceptación:
    - El prompt deja explícito que el finding ya fue determinado por el motor de reglas — Claude solo enriquece, no decide si es o no una violación.
    - La respuesta esperada sigue un schema fijo y documentado.

- **HU-B2.2** — Como sistema, quiero parsear la respuesta de Claude de forma defensiva (buscando el bloque JSON dentro del texto, no asumiendo que la respuesta completa es JSON), para tolerar texto adicional antes/después del JSON.
  - Criterios de aceptación:
    - Si Claude agrega texto antes o después del JSON, el parseo lo extrae igual.
    - Si el parseo falla o el JSON no matchea el schema, el finding se marca con un estado de error en vez de romper el pipeline completo.

- **HU-B2.3** — Como sistema, quiero validar toda salida de Claude contra un schema antes de guardarla en Postgres, para nunca persistir enriquecimientos malformados.
  - Criterios de aceptación:
    - Existe una validación de schema (ej. tipos, campos requeridos, valores permitidos de severidad) previa al insert.
    - Un finding que no pasa validación no se guarda como "enriquecido" — queda trazado como pendiente/fallido.

### Épica B3 — API y persistencia de hallazgos (Fase 1)
Expone los findings enriquecidos al frontend y persiste todo en PostgreSQL.

- **HU-B3.1** — Como frontend, quiero un endpoint que liste todos los hallazgos con sus datos enriquecidos (severidad, requisito PCI-DSS, explicación, remediación, estado), para poblar el dashboard.
  - Criterios de aceptación:
    - Endpoint REST (ej. `GET /findings`) devuelve la lista completa en JSON.
    - Soporta filtrar por severidad y por requisito PCI-DSS vía query params.

- **HU-B3.2** — Como frontend, quiero un endpoint de detalle de un hallazgo específico, para mostrar toda su información (snippet, explicación completa, remediación) en una vista dedicada.
  - Criterios de aceptación:
    - Endpoint (ej. `GET /findings/:id`) devuelve el hallazgo completo o 404 si no existe.

- **HU-B3.3** — Como sistema, quiero persistir cada finding crudo y su enriquecimiento en PostgreSQL con un esquema único sin importar el origen, para que el dashboard y el risk score se calculen sobre una sola fuente de verdad.
  - Criterios de aceptación:
    - Existe una migración/esquema de tabla `findings` (o similar) que cubre campos crudos + campos de enriquecimiento.
    - Insertar un finding de código y uno de log (cuando exista Fase 2) usa la misma tabla/esquema.

- **HU-B3.4** — Como responsable de compliance, quiero un endpoint que devuelva un risk score agregado (ej. por severidad y cantidad de hallazgos abiertos), para ver de un vistazo el estado de cumplimiento.
  - Criterios de aceptación:
    - Endpoint (ej. `GET /risk-score`) devuelve un número o desglose calculado a partir de los findings persistidos.
    - La fórmula de cálculo está documentada (aunque sea simple para el MVP).

- **HU-B3.5** — Como sistema, quiero disparar el pipeline completo (analizador → motor de razonamiento → persistencia) con un solo trigger (endpoint o script), para poder correr la demo en vivo sin pasos manuales.
  - Criterios de aceptación:
    - Un único comando o endpoint (ej. `POST /scan`) ejecuta el flujo end-to-end sobre un repo/target dado.
    - Devuelve o deja consultable el resultado del scan al finalizar.

### Épica B4 — Analizador de Logs (Fase 2, stretch)
Reutiliza el motor de reglas del Analizador Estático aplicado a logs, sin construirlo desde cero.

- **HU-B4.1** — Como sistema, quiero aplicar las mismas reglas PCI-DSS (o un subconjunto adaptado) sobre líneas de log, para detectar fugas de datos sensibles en producción.
  - Criterios de aceptación:
    - Reutiliza el mismo motor de reglas y el mismo esquema de finding crudo que el Analizador Estático.
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

### Épica F1 — Dashboard de Compliance: listado y risk score (Fase 1)
Vista principal con todos los hallazgos y el estado agregado de cumplimiento.

- **HU-F1.1** — Como responsable de compliance, quiero ver una tabla/lista con todos los hallazgos (severidad, requisito PCI-DSS, archivo/fuente, estado), para tener visibilidad general del riesgo.
  - Criterios de aceptación:
    - La vista consume el endpoint `GET /findings` del backend.
    - Cada fila muestra al menos severidad, requisito PCI-DSS y origen del hallazgo.

- **HU-F1.2** — Como responsable de compliance, quiero ver un indicador de risk score agregado en la parte superior del dashboard, para entender el estado general sin tener que leer cada hallazgo.
  - Criterios de aceptación:
    - Consume el endpoint de risk score del backend.
    - El indicador se actualiza al recargar o refrescar la vista.

- **HU-F1.3** — Como responsable de compliance, quiero identificar visualmente la severidad de cada hallazgo (ej. color o etiqueta: crítico/alto/medio/bajo), para priorizar qué atender primero.
  - Criterios de aceptación:
    - Cada nivel de severidad tiene una representación visual distinta y consistente en toda la app.

### Épica F2 — Detalle de hallazgo (Fase 1)
Vista dedicada a un hallazgo individual con toda la información enriquecida por Claude.

- **HU-F2.1** — Como responsable de compliance, quiero hacer click en un hallazgo de la lista y ver su detalle completo (snippet, explicación, remediación sugerida), para entender el problema y cómo resolverlo.
  - Criterios de aceptación:
    - Navega a una vista de detalle que consume `GET /findings/:id`.
    - Se muestra el snippet de código/log con el requisito PCI-DSS asociado, la explicación y la remediación tal como las devolvió el motor de razonamiento.

- **HU-F2.2** — Como responsable de compliance, quiero volver fácilmente del detalle al listado, para revisar varios hallazgos en secuencia sin perder el contexto de filtros aplicados.
  - Criterios de aceptación:
    - Existe navegación de vuelta (botón/breadcrumb) que preserva filtros previamente aplicados.

### Épica F3 — Filtros y búsqueda (Fase 1)
Permite acotar la lista de hallazgos para focalizar la revisión.

- **HU-F3.1** — Como responsable de compliance, quiero filtrar hallazgos por severidad, para enfocarme primero en los críticos/altos.
  - Criterios de aceptación:
    - El filtro llama al backend con el query param correspondiente o filtra client-side sobre los datos ya cargados.

- **HU-F3.2** — Como responsable de compliance, quiero filtrar hallazgos por requisito PCI-DSS, para revisar el cumplimiento de un requisito específico.
  - Criterios de aceptación:
    - El filtro combina correctamente con el de severidad (ambos aplicados a la vez si corresponde).

### Épica F4 — Disparo de análisis desde la UI (Fase 1)
Permite correr la demo en vivo sin usar la terminal.

- **HU-F4.1** — Como PM, quiero un botón en el dashboard que dispare un nuevo escaneo (`POST /scan`), para mostrar el flujo completo en vivo durante la demo.
  - Criterios de aceptación:
    - El botón llama al endpoint de scan y muestra un estado de carga mientras corre.
    - Al finalizar, el listado y el risk score se refrescan automáticamente con los nuevos resultados.

- **HU-F4.2** — Como PM, quiero ver un estado claro de "analizando..." y luego de "completado" o "error", para que la demo sea legible para la audiencia.
  - Criterios de aceptación:
    - Hay feedback visual explícito de los tres estados (idle/loading/completado/error).

### Épica F5 — Trazabilidad código↔log (Fase 2, stretch)
Vista que conecta un hallazgo de log con el código que lo originó.

- **HU-F5.1** — Como responsable de compliance, quiero ver, dentro del detalle de un hallazgo de log, el archivo de código correlacionado que generó ese log, para entender el origen real del problema.
  - Criterios de aceptación:
    - Si el backend devuelve una correlación código↔log, se muestra en la vista de detalle.
    - Si no hay correlación encontrada, se indica explícitamente en vez de dejar la sección vacía sin explicación.

---

## Notas de priorización
- Todo lo marcado **Fase 1** debe funcionar de punta a punta antes de tocar cualquier historia de **Fase 2**.
- No hay épicas de autenticación, multi-usuario ni pulido visual — están explícitamente fuera de alcance según [CLAUDE.md](../CLAUDE.md).
- Ir registrando durante el desarrollo qué historias se resolvieron con ayuda directa de Claude Code y cuánto tiempo ahorraron — pesa 30 pts en la evaluación del hackathon.
