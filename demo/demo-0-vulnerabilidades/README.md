# pci-dss-vulnerable-demo — variante `demo/0-vulnerabilidades`

Material de referencia detrás de la opción **`payments-core · demo/0-vulnerabilidades`** del selector "Repositorio" de IONIX Sentinel. Copia de `../Ionix-sentinel-demo` con **las 7 vulnerabilidades corregidas**: el repo de pagos queda funcional y seguro.

> El botón "Escanear repo" **no lee estos archivos**: al analizar la rama `demo-0` el backend borra la tabla `findings` y no inserta nada (0 hallazgos). Esta carpeta muestra cómo se ve el mismo código una vez remediado.

## Las 7 correcciones

| ID | Archivo | Corrección |
|---|---|---|
| VULN-002 | `migrations/001_init.sql` | PAN ya no se guarda en claro: `pan_token` + `pan_last4` |
| VULN-003b | `pages/api/payments/charge.ts` | Consulta parametrizada con bindings (`$1..$4`) |
| VULN-004 | `lib/crypto.ts` | Sin clave hardcodeada ni AES-128-ECB; usa `encryptPanStrong` (AES-256-GCM) |
| VULN-006 | `pages/api/payments/[id].ts` | Verificación de sesión + rol antes de responder |
| VULN-009 | `pages/api/webhooks/stripe.ts` | API key desde `process.env.STRIPE_SECRET_KEY` |
| VULN-011 | `lib/db.ts` | `ssl: { rejectUnauthorized: true }` — TLS obligatorio |
| VULN-LIB-001 | `package.json` | `lodash` actualizado a `^4.17.21` |

Los 3 controles negativos (`TRAP-T1/T2/T3`) se mantienen y siguen sin generar hallazgo. Variantes hermanas: `../Ionix-sentinel-demo` (7) y `../demo-3-vulnerabilidades` (3).
