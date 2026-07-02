# Modelo Entidad-Relación — IONIX Sentinel (diseño alternativo, no implementado)

> **⚠️ Superado por el esquema real.** El equipo decidió un diseño más simple: una única tabla `findings`, con las reglas viviendo en YAML (no en una tabla `rules`) y sin tabla `scans` propia. Ver el esquema efectivamente implementado en [`04-database.docs.md`](./04-database.docs.md) y [`07-backend-spec.docs.md`](./07-backend-spec.docs.md) §6. Este documento y su diagrama quedan como referencia de un diseño normalizado que se evaluó pero no se construyó — no lo uses para generar scripts SQL nuevos.

Diagrama editable: [modelo-entidad-relacion.drawio](modelo-entidad-relacion.drawio) — ábrelo en [draw.io](https://app.diagrams.net) (Archivo → Abrir) o con la extensión de draw.io en VS Code.

Este modelo soporta el esquema único de "finding crudo" descrito en [CLAUDE.md](../CLAUDE.md): código y logs se persisten en la misma tabla `findings`, sin tipos de datos distintos según el origen.

## Entidades

### `pci_requirements` (Fase 1)
Catálogo de requisitos PCI-DSS contra los que se evalúan las reglas.
| Campo | Tipo | Notas |
|---|---|---|
| id | SERIAL (PK) | |
| code | VARCHAR(10) | ej. "3.4" |
| title | VARCHAR(200) | |
| description | TEXT | |

### `rules` (Fase 1)
Reglas propias PCI-DSS (10-12 para el MVP) + las que provienen de semgrep.
| Campo | Tipo | Notas |
|---|---|---|
| id | SERIAL (PK) | |
| code | VARCHAR(50) | identificador único de la regla |
| name | VARCHAR(200) | |
| source_type | VARCHAR(20) | `codigo` \| `log` |
| pattern | TEXT | referencia al patrón/regex/regla semgrep |
| description | TEXT | |
| pci_requirement_id | INTEGER (FK → pci_requirements.id) | |

### `scans` (Fase 1)
Cada ejecución del pipeline (analizador → motor de razonamiento → persistencia).
| Campo | Tipo | Notas |
|---|---|---|
| id | SERIAL (PK) | |
| target | VARCHAR(255) | repo o ruta analizada |
| type | VARCHAR(20) | `codigo` \| `logs` |
| status | VARCHAR(20) | pending / running / completed / error |
| started_at | TIMESTAMP | |
| completed_at | TIMESTAMP | |

### `findings` (Fase 1)
Tabla central. Esquema único para hallazgos de código y de logs — combina campos crudos (del motor de reglas) y campos enriquecidos (de Claude).
| Campo | Tipo | Notas |
|---|---|---|
| id | SERIAL (PK) | |
| scan_id | INTEGER (FK → scans.id) | |
| rule_id | INTEGER (FK → rules.id) | |
| origin | VARCHAR(20) | `codigo` \| `log` |
| source_reference | VARCHAR(255) | archivo o fuente del log |
| line_number | INTEGER | |
| snippet | TEXT | contexto enviado a Claude |
| raw_data | JSONB | salida cruda del motor de reglas (semgrep u otra) |
| severity | VARCHAR(20) | asignada por Claude |
| explanation | TEXT | asignada por Claude |
| remediation | TEXT | asignada por Claude |
| status | VARCHAR(20) | crudo / enriquecido / error_enriquecimiento |
| created_at | TIMESTAMP | |
| enriched_at | TIMESTAMP | nullable hasta que Claude responde |

### `log_correlations` (Fase 2 — stretch)
Correlación código↔log vía grep del string literal del log sobre el repo.
| Campo | Tipo | Notas |
|---|---|---|
| id | SERIAL (PK) | |
| log_finding_id | INTEGER (FK → findings.id) | el hallazgo de log |
| code_finding_id | INTEGER (FK → findings.id, nullable) | el hallazgo de código correlacionado, si existe |
| code_file | VARCHAR(255) | archivo encontrado por grep |
| matched_line | INTEGER | |
| created_at | TIMESTAMP | |

## Relaciones
- `pci_requirements` 1—N `rules`
- `rules` 1—N `findings`
- `scans` 1—N `findings`
- `findings` 1—N `log_correlations` (vía `log_finding_id`)
- `findings` 1—N `log_correlations` (vía `code_finding_id`, Fase 2)

## Notas de diseño
- El risk score agregado (`GET /risk-score` en el backend) se calcula on-the-fly a partir de `findings` — no se modela como tabla propia para no sobre-diseñar el MVP.
- `log_correlations` solo aplica si se llega a construir el Analizador de Logs (Fase 2). Si el hackathon no llega a esa fase, el modelo funciona completo sin esa tabla.
- Sin tablas de usuarios/autenticación — está fuera de alcance según las reglas duras del proyecto.
