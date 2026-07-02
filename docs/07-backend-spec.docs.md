# 07 · Backend — Especificación de producto

> Este documento describe **hacia dónde va el backend** (el producto del pitch): analizador estático → motor de reglas dinámico → razonamiento con Claude → persistencia. La base CRUD que ya existe está descrita en [`03-backend.docs.md`](./03-backend.docs.md); esta spec la extiende, no la reemplaza.
>
> **Stack decidido:** Node.js + Express + TypeScript. El analizador usa **semgrep como subproceso** (independiente del lenguaje analizado) y Claude vía `@anthropic-ai/sdk`. *(Nota: el slide 6 del pitch dice "Python/FastAPI" — hay que actualizarlo para que diga Node.js.)*

## 1. Qué construye el backend

El backend orquesta un pipeline determinístico + una capa de enriquecimiento con IA:

```
  código (ruta/repo)
        │
        ▼
 ┌─────────────────┐   findings crudos    ┌──────────────────┐  finding enriquecido  ┌────────────┐
 │ 1. Analizador   │ ───────────────────▶ │ 3. Motor de      │ ────────────────────▶ │ 4. Postgres│
 │    estático     │  (semgrep + reglas   │    razonamiento  │  (+ severidad,        │  (findings)│
 │    + Luhn (PAN) │   propias, esquema   │    Claude Sonnet │   explicación,        └─────┬──────┘
 └─────────────────┘   único JSON)        └──────────────────┘   remediación)              │
        ▲                                                                                   ▼
 ┌─────────────────┐                                                              ┌────────────────┐
 │ 2. Motor de     │  reglas en YAML/JSON — la ÚNICA fuente de verdad             │ 5. API REST →  │
 │    reglas       │  de "qué es una violación PCI-DSS"                           │    dashboard   │
 └─────────────────┘                                                              └────────────────┘
```

**Regla dura (del `CLAUDE.md`):** el motor de reglas decide *qué* es una violación. Claude **solo enriquece** (severidad final, explicación, remediación) — nunca "encuentra" hallazgos por su cuenta.

## 2. Estructura de carpetas (extendida)

```text
backend/src/
├── index.ts                 # entrypoint Express (ya existe)
├── config/env.ts            # + ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_MAX_TOKENS
├── db/
│   ├── pool.ts              # ya existe
│   └── init.sql             # extender tabla findings (ver §6)
├── routes/
│   ├── health.routes.ts     # ya existe
│   ├── findings.routes.ts   # ya existe → agregar GET :id, PATCH :id, filtros
│   └── scan.routes.ts       # NUEVO: POST /api/scan, GET /api/scans/:id
├── analysis/                # NUEVO — Analizador Estático
│   ├── runner.ts            # invoca semgrep como subproceso (--json), parsea salida
│   ├── luhn.ts              # valida PAN antes de emitir finding (evita falsos positivos)
│   └── mapper.ts            # normaliza cada match al esquema "finding crudo"
├── rules/                   # NUEVO — Motor de reglas dinámico
│   ├── pci-rules.yaml       # reglas propias (patrón semgrep/regex → requisito PCI-DSS)
│   └── loader.ts            # carga y valida el YAML al arrancar
├── reasoning/               # NUEVO — Motor de Razonamiento (Claude)
│   ├── client.ts            # cliente @anthropic-ai/sdk
│   ├── prompt.ts            # construye el prompt (deja claro: la regla ya decidió)
│   └── parse.ts             # parseo DEFENSIVO del JSON + validación de schema
└── types/
    └── finding.ts           # extender (ver §3)
```

## 3. Contrato de datos — esquema único de `Finding`

Un solo esquema para código y (futuro) logs. Los campos nuevos vs. el scaffold están marcados con `+`.

```ts
export type Severity = "low" | "medium" | "high" | "critical";
export type Source = "code" | "log";
export type Status = "open" | "acknowledged" | "resolved" | "false_positive"; // +
export type ReasoningStatus = "ok" | "error"; // +

export interface Finding {
  id: string;
  ruleId: string;            // + id de la regla que disparó, ej. "PCI-PAN-PLAINTEXT"
  pciRequirement: string;    //   ej. "3.5.1"
  title: string;             //   visible al usuario, en español
  severity: Severity;        //   final (rango definido por la regla; Claude confirma)
  source: Source;
  filePath: string;          // + ej. "migrations/001_init.sql"
  lineNumber: number | null; // +
  snippet: string;           // + fragmento de contexto que disparó el hallazgo
  explanation: string;       // + generado por Claude (español)
  remediation: string;       // + generado por Claude (español)
  status: Status;            // + estado en el dashboard (default "open")
  scanId: string;            // + a qué corrida de análisis pertenece
  reasoningStatus: ReasoningStatus; // + "error" si el parseo de Claude falló (no rompe el pipeline)
  createdAt: string;
}
```

**Finding crudo** (salida del analizador, antes de Claude): igual pero sin `explanation`, `remediation`, `reasoningStatus`, y con `severity` = severidad base de la regla.

## 4. Pipeline etapa por etapa

### Etapa 1 — Analizador estático (`analysis/`)
- Recibe una ruta de código (para la demo: `../Ionix-sentinel-demo`).
- Invoca **semgrep** como subproceso con las reglas de `rules/pci-rules.yaml` y `--json`.
- **Falla de forma controlada** si semgrep no está instalado o la ruta no existe (no descarta stdout/stderr sin revisar).
- Para posibles PAN (números de tarjeta): pasa el match por **Luhn** (`luhn.ts`); si no valida, **no** se emite finding. (Existe test con PAN válidos/inválidos conocidos.)
- `mapper.ts` normaliza cada match al esquema *finding crudo*.

### Etapa 2 — Motor de reglas dinámico (`rules/`)
Las reglas viven en YAML/JSON, **no en el código**. Formato de una regla:

```yaml
- id: PCI-PAN-PLAINTEXT
  pciRequirement: "3.5.1"
  title: "PAN almacenado sin cifrar"
  severity: critical              # severidad base
  detector: semgrep               # semgrep | regex
  pattern: |                      # patrón semgrep (o regex si detector: regex)
    $COL = $VALUE
  luhn: true                      # si aplica validación Luhn (solo PAN)
```

Agregar/ajustar una regla = editar el YAML, **sin tocar el motor**. Cada regla tiene id único + requisito PCI-DSS. Objetivo Fase 1: **10–12 reglas bien hechas en un solo lenguaje** (el repo demo es TS/Next.js), no muchas a medias.

### Etapa 3 — Motor de razonamiento (`reasoning/`)
- Modelo: **Claude Sonnet** (`ANTHROPIC_MODEL=claude-sonnet-5`), vía `@anthropic-ai/sdk`.
- Por cada finding crudo + snippet, el prompt deja **explícito** que el hallazgo ya fue determinado por el motor de reglas — Claude solo enriquece.
- Output esperado (schema fijo):

```json
{
  "pciRequirement": "3.5.1",
  "severity": "critical",
  "explanation": "...",
  "remediation": "..."
}
```

- **Parseo defensivo** (`parse.ts`): buscar el bloque JSON dentro del texto (Claude a veces agrega prosa antes/después) — **nunca** asumir que el string completo es JSON. Si el parseo falla o no matchea el schema → el finding se guarda con `reasoningStatus: "error"` en vez de romper el pipeline completo.
- Recomendado: `output_config: { format: { type: "json_schema", schema: ... } }` para forzar salida estructurada (ver skill `claude-api`).

### Etapa 4/5 — Persistencia + API
Finding enriquecido → `INSERT` en Postgres → disponible vía la API.

## 5. Endpoints (contrato con el frontend)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/scan` | Dispara análisis de una ruta. Body `{ "path": "../Ionix-sentinel-demo" }`. Devuelve `{ scanId, findingsCount, riskScore }`. |
| `GET` | `/api/scans/:id` | Resumen de una corrida: risk score + conteos por severidad. |
| `GET` | `/api/findings` | Lista con filtros query: `?severity=&source=&status=&scanId=`. Orden por severidad desc. |
| `GET` | `/api/findings/:id` | Detalle de un finding (incluye snippet, explicación, remediación). |
| `PATCH` | `/api/findings/:id` | Cambia `status` (ej. `acknowledged`, `false_positive`). |
| `GET` | `/health`, `/api/health` | Ya existen (proceso vivo / conexión a DB). |

### Risk score (agregado)
Fórmula simple y explicable (documentarla tal cual en el dashboard):

```
riskScore = 10*critical + 5*high + 2*medium + 1*low
```

Se calcula por `scanId` y se muestra como número + nivel (ej. 0=verde, 1–9=amarillo, 10+=rojo). *(No es ML — es un umbral simple, y así se dice en la demo.)*

## 6. Base de datos — migración de `findings`

Extender `db/init.sql` (snake_case en SQL, camelCase en JSON/TS):

```sql
ALTER TABLE findings ADD COLUMN IF NOT EXISTS rule_id          TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS file_path        TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS line_number      INTEGER;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS snippet          TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS explanation      TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS remediation      TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'open'
  CHECK (status IN ('open','acknowledged','resolved','false_positive'));
ALTER TABLE findings ADD COLUMN IF NOT EXISTS scan_id          TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS reasoning_status TEXT NOT NULL DEFAULT 'ok'
  CHECK (reasoning_status IN ('ok','error'));
```

## 7. Variables de entorno (backend)

```
ANTHROPIC_API_KEY=sk-ant-...     # ya lo tienes en tu .env local (no commitear)
ANTHROPIC_MODEL=claude-sonnet-5
ANTHROPIC_MAX_TOKENS=4096
DATABASE_URL=postgresql://...
PORT=3000
```

## 8. Validación contra el repo demo (ground truth)

El worktree `../Ionix-sentinel-demo` (rama `pci-vulnerable-demo`) trae `findings-expected.json` con **12 violaciones reales + 3 controles negativos**. Sirve para medir:
- **Precisión/recall:** ¿el analizador reporta las `real_violations` y NO reporta los `negative_controls`?
- **Caso de demo reproducible** (HU-B1.5 en [`epicas-historias.md`](./epicas-historias.md)).

## 9. Reglas duras a respetar (del `CLAUDE.md`)
- El motor de reglas determinístico es la **única fuente de verdad**. Claude nunca decide por su cuenta.
- Toda salida de Claude se **parsea y valida contra un schema** antes de guardar. Nunca asumir JSON válido.
- Sin ML real de detección de anomalías — umbrales simples, y decirlo en la demo.
- No gastar tiempo en auth, multi-usuario ni pulido: **que funcione en vivo pesa más que verse perfecto**.

## 10. Épicas relacionadas
Ver [`epicas-historias.md`](./epicas-historias.md): B1 (Analizador Estático), B2 (Motor de Razonamiento).
