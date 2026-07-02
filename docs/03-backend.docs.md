# 03 · Backend

## Stack

- Node.js 20
- TypeScript
- Express
- `pg` (driver de PostgreSQL, sin ORM por ahora)
- `tsx` para hot reload en desarrollo

## Estructura de carpetas

```text
backend/
├── Dockerfile
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts               # entrypoint: crea app Express, monta rutas
    ├── config/
    │   └── env.ts             # lectura centralizada de variables de entorno
    ├── db/
    │   ├── pool.ts            # pool de conexión a PostgreSQL (pg.Pool)
    │   └── init.sql           # script SQL que crea la tabla findings
    ├── routes/
    │   ├── health.routes.ts   # GET /health y GET /api/health
    │   └── findings.routes.ts # GET/POST /api/findings
    └── types/
        └── finding.ts         # tipos TypeScript compartidos (Finding, Severity, Source)
```

## Endpoints disponibles

### `GET /health`

Chequeo simple de que el proceso está vivo (no toca la base de datos).

```json
{ "status": "ok", "service": "ionix-sentinel-backend" }
```

### `GET /api/health`

Valida la conexión a PostgreSQL con un `SELECT 1`.

```json
{ "status": "ok", "database": "connected" }
```

### `GET /api/findings`

Devuelve todos los findings, ordenados por fecha de creación descendente.

### `POST /api/findings`

Crea un finding nuevo. Body esperado:

```json
{
  "title": "Credencial hardcodeada",
  "description": "Se encontró una API key en el código fuente",
  "severity": "high",
  "pciRequirement": "6.5.1",
  "source": "code"
}
```

`severity` debe ser una de: `low`, `medium`, `high`, `critical`.
`source` debe ser una de: `code`, `log`.

## Cómo agregar nuevas rutas

1. Crea un archivo en `src/routes/`, por ejemplo `analysis.routes.ts`, exportando un `Router` de Express.
2. Móntalo en `src/index.ts` con `app.use(analysisRouter)`.
3. Si el modelo de datos crece, agrega o extiende tipos en `src/types/`.
4. Si necesitas queries nuevas, usa el `pool` de `src/db/pool.ts` directamente (no hay capa de repositorio todavía — mantenlo simple mientras el modelo sea chico).

## Tareas sugeridas para el compañero de backend

- Agregar paginación y filtros a `GET /api/findings` (por severidad, por fuente, por rango de fechas).
- Agregar validación más robusta del body en `POST /api/findings` (por ejemplo, largo máximo de `title`/`description`).
- Preparar un endpoint futuro tipo `POST /api/analysis/scan` que reciba código o un repo y dispare el motor de análisis PCI-DSS (persona 4).
- Agregar manejo de errores centralizado (middleware de error) si los endpoints empiezan a repetir lógica de `try/catch`.
