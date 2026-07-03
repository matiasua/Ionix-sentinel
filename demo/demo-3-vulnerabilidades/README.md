# pci-dss-vulnerable-demo — variante `demo/3-vulnerabilidades`

Material de referencia detrás de la opción **`payments-core · demo/3-vulnerabilidades`** del selector "Repositorio" de IONIX Sentinel. Copia de `../Ionix-sentinel-demo` (la de 7) con **4 de las 7 vulnerabilidades corregidas en el código**, dejando 3 activas.

> El botón "Escanear repo" **no lee estos archivos**: siembra en Postgres las 3 filas definidas en `backend/src/scan/seeds.ts` (rama `demo-3`). Esta carpeta respalda la narrativa y sirve para auditar manualmente que el código coincide con lo sembrado.

## 3 vulnerabilidades activas (una por categoría y por severidad)

| ID | Categoría | Severidad | Archivo | Req. PCI-DSS |
|---|---|---|---|---|
| VULN-002 | pci_compliance | Crítica | `migrations/001_init.sql` | 3.5.1 — PAN en texto plano |
| VULN-003b | código | Alta | `pages/api/payments/charge.ts` | 6.2.4 — Inyección SQL |
| VULN-LIB-001 | librería | Media | `package.json` | 6.3.3 — lodash 4.17.15 (CVE-2020-8203) |

## Las 4 corregidas respecto a la variante de 7

| ID | Archivo | Corrección |
|---|---|---|
| VULN-006 | `pages/api/payments/[id].ts` | Verificación de sesión + rol antes de responder; PAN enmascarado |
| VULN-004 | `lib/crypto.ts` | Sin clave hardcodeada ni AES-128-ECB; usa `encryptPanStrong` (AES-256-GCM) |
| VULN-009 | `pages/api/webhooks/stripe.ts` | API key desde `process.env.STRIPE_SECRET_KEY` |
| VULN-011 | `lib/db.ts` | `ssl: { rejectUnauthorized: true }` — TLS obligatorio |

Los 3 controles negativos (`TRAP-T1/T2/T3`) se mantienen intactos. Ver `findings-expected.json` para el detalle. La variante con las **7** está en `../Ionix-sentinel-demo`; la variante con **0** (todo corregido) en `../demo-0-vulnerabilidades`.
