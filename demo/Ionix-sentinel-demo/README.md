# pci-dss-vulnerable-demo — rama `demo/7-vulnerabilidades`

Repo de práctica con **exactamente 7 vulnerabilidades intencionales**, mapeadas a **PCI-DSS v4.0**, curado para que el botón **"Escanear repo"** del dashboard de IONIX Sentinel dispare un análisis que inserte estas 7 filas en Postgres y el dashboard las muestre.

> Esta rama es una versión **reducida** del fixture original de 12 escenarios (18 sub-hallazgos) + fixtures de logs para la Fase 2. Ese fixture completo, sin curar, sigue disponible en la rama [`main`](../../tree/main) de este mismo repo por si se necesita ampliar la cobertura de la demo más adelante.

Stack: Node.js + TypeScript + Next.js + React + Postgres — el mismo stack de la solución real, para que el analizador la pruebe contra código representativo.

**No desplegar ni usar como base de un proyecto real.** Las credenciales, keys y datos de tarjeta son ficticios pero el patrón de la falla es real.

## Cómo usarlo con Sentinel

1. Apuntar el Analizador Estático a esta rama (`demo/7-vulnerabilidades`).
2. Comparar los hallazgos que emite Sentinel contra `findings-expected.json` (ground truth) — debe reportar exactamente las 7 de `real_violations` y ninguna de `negative_controls`.
3. El botón "Escanear repo" del dashboard debería, en definitiva, insertar estas 7 filas en la tabla `findings` de Postgres.

## Las 7 vulnerabilidades

Se eligieron para cubrir las 3 familias de hallazgo que el proyecto detecta: vulnerabilidades de **librería** (dependencias con CVE conocido), de **código** (bugs de implementación que no dependen del dominio de pagos) y de **cumplimiento PCI-DSS** (manejo indebido de datos de tarjeta). En la práctica **las 7 mapean a un requisito PCI-DSS** — así funciona el motor de reglas del proyecto — pero se agrupan aquí por su naturaleza técnica dominante.

| ID | Categoría | Severidad | Archivo | Requisito PCI-DSS v4 | Qué encontrarías |
|---|---|---|---|---|---|
| VULN-002 | `pci_compliance` | Crítica | `migrations/001_init.sql:8` | 3.5.1 | PAN almacenado en texto plano |
| VULN-006 | `pci_compliance` | Crítica | `pages/api/payments/[id].ts:8` | 7.2.1 | Endpoint sin auth que expone el PAN completo |
| VULN-004 | `código` | Alta | `lib/crypto.ts:7` | 3.6.1 | Clave de cifrado hardcodeada + AES-128-ECB (modo débil) |
| VULN-003b | `código` | Alta | `pages/api/payments/charge.ts:14` | 6.2.4 | Inyección SQL por concatenación de strings |
| VULN-009 | `código` | Alta | `pages/api/webhooks/stripe.ts:7` | 8.6.2 | API key de Stripe hardcodeada en el código |
| VULN-011 | `pci_compliance` | Media | `lib/db.ts:10` | 4.2.1 | Conexión a Postgres sin TLS (`ssl: false`) |
| VULN-LIB-001 | `librería` | Media | `package.json:17` | 6.3.3 | Dependencia `lodash@4.17.15` — CVE-2020-8203 (prototype pollution) |

### Detalle de cada una

**VULN-002 — PAN en texto plano (`migrations/001_init.sql`)**
La tabla `cardholders` guarda el número de tarjeta en una columna `VARCHAR(19)` sin truncar, tokenizar ni cifrar. PCI-DSS 3.5.1 exige que el PAN sea ilegible en cualquier lugar donde se almacene. Cualquier acceso a esa tabla —incluido un dump o un backup— expone tarjetas completas.

**VULN-006 — Endpoint sin autenticación que expone el PAN (`pages/api/payments/[id].ts`)**
`GET /api/payments/:id` devuelve el registro completo del cardholder (incluido el PAN) sin verificar sesión ni rol. Cualquiera que conozca o adivine un `id` puede leer datos de tarjeta de otro cliente. PCI-DSS 7.2.1 exige control de acceso basado en necesidad de negocio para todo componente del entorno de datos de tarjeta.

**VULN-004 — Clave de cifrado hardcodeada + AES-128-ECB (`lib/crypto.ts`)**
`weakEncryptPan` usa una clave literal en el código (`s3cr3tKey123456`) y el modo ECB, que no usa IV, es determinístico y filtra patrones del texto plano — no califica como "cifrado fuerte" para proteger PAN (PCI-DSS 3.6.1). El mismo archivo tiene, a propósito, `encryptPanStrong` con AES-256-GCM y clave desde variable de entorno como contraste de la implementación correcta.

**VULN-003b — Inyección SQL (`pages/api/payments/charge.ts`)**
El insert de un nuevo cardholder concatena `customerEmail`, `pan` y `expiry` directo en el string SQL en vez de usar parámetros preparados (la función `query()` sí los soporta, pero aquí no se usan). PCI-DSS 6.5.1/6.2.4 exige proteger contra fallas de inyección; un atacante puede manipular esos campos para leer o alterar la tabla completa.

**VULN-009 — API key de Stripe hardcodeada (`pages/api/webhooks/stripe.ts`)**
La clave del proveedor de pagos está embebida como literal en el código y versionada en el repo. Si el repositorio se filtra o queda en un fork público, la key queda comprometida y permite operar contra la cuenta real de Stripe. PCI-DSS 8.6.2 exige que las credenciales de aplicaciones y servicios se gestionen de forma segura, no como texto en el código fuente.

**VULN-011 — Conexión a la base de datos sin TLS (`lib/db.ts`)**
El pool de Postgres se crea con `ssl: false` explícito, así que el tráfico entre la aplicación y la base de datos —que transporta el PAN— viaja sin cifrar. PCI-DSS 4.2.1 exige criptografía fuerte para cualquier transmisión de datos de tarjeta, incluido el tráfico interno entre servicios.

**VULN-LIB-001 — Dependencia vulnerable: `lodash@4.17.15` (`package.json`)**
Esa versión tiene vulnerabilidades públicas de *prototype pollution* (CVE-2020-8203) y *command injection* (CVE-2021-23337), ambas parchadas en versiones posteriores. PCI-DSS 6.3.3 exige instalar parches de seguridad dentro del mes de su publicación; fijar una versión vieja sin actualizar deja el componente expuesto a exploits conocidos y públicos.

## Controles negativos (se mantienen, no cuentan como vulnerabilidad)

Estos tres casos existen a propósito para comprobar que el motor de reglas **no genera falsos positivos** — uno de los gotchas documentados del proyecto (un regex de PAN sin validación de Luhn genera ruido masivo):

- **`lib/testCards.ts`** — números de 16 dígitos que fallan el checksum de Luhn. No son PAN reales; no deben marcarse como hallazgo.
- **`lib/mask.ts`** — implementación correcta de enmascaramiento de PAN (primeros 6 + últimos 4). Se usa en `components/AdminReconciliation.tsx` para no mostrar el PAN sin enmascarar en pantalla.
- **`lib/crypto.ts` → `encryptPanStrong`** — AES-256-GCM con clave desde variable de entorno e IV aleatorio, al lado de `weakEncryptPan` (VULN-004) como contraste correcto/incorrecto.

## Qué se corrigió respecto al fixture original

El fixture original (rama `main`) tenía 12 escenarios base / 18 sub-hallazgos. Para dejar exactamente 7, el resto se **corrigió en el código** en vez de solo eliminarse, así la app queda funcional y coherente:

| Vulnerabilidad original | Corrección aplicada |
|---|---|
| VULN-001 — password de DB hardcodeada | Se lee de `DATABASE_URL` (`.env.example`) |
| VULN-002b/002c — columnas CVV y track2 en `cardholders` | Columnas eliminadas de la migración; PCI-DSS prohíbe persistir CVV/track2 (SAD) siempre |
| VULN-003a/003c/003d — PAN/CVV en logs, persistencia de track2, PAN/CVV en JSONB | Se eliminó el logging y la persistencia de esos datos en `charge.ts` |
| VULN-005 — secreto JWT hardcodeado sin expiración | Se lee de `JWT_SECRET`; tokens expiran a los 15 minutos |
| VULN-007/VULN-016 — PAN como query param GET + logueado en refund | `refund.ts` ahora es `POST` y referencia al cardholder por `id` interno, nunca por PAN |
| VULN-008a/008b — PAN/CVV en `localStorage` y `console.log` del navegador | Se eliminó esa persistencia y logging en `CheckoutForm.tsx` |
| VULN-010 — PAN sin enmascarar en la UI de conciliación | `AdminReconciliation.tsx` ahora usa `maskPan()` |
| VULN-012/VULN-015b — stack trace devuelto al cliente | `login.ts` devuelve un mensaje genérico; el detalle solo se loguea server-side |
| VULN-013 — connection string con password logueada en error del pool | Se loguea un mensaje genérico sin credenciales |
| VULN-014 — secreto JWT logueado en fallos de verificación | Se eliminó el secreto del mensaje de log |
| VULN-015a — mensaje de log de login fallido | Se mantiene como log de auditoría (sin exponer nada al cliente) |
| VULN-017 — registro completo (con PAN) logueado en cada consulta | Se eliminó ese logging |

Los fixtures de logs de producción y sus 8 `log_violations` (Fase 2, stretch goal) se removieron de esta rama junto con `logs/` y `scripts/generate-production-logs.js` — siguen disponibles en `main` si el equipo llega a esa fase.

## Nota sobre el mapeo a requisitos

Los números de requisito PCI-DSS v4.0 usados aquí son el mapeo más cercano y representativo para cada patrón de falla, pensado para la demo del hackathon. Antes de citarlos en cualquier material externo o de cumplimiento real, verificar contra el texto oficial de PCI-DSS v4.0.1.

## Estructura

```
pci-dss-vulnerable-demo/
├── README.md
├── findings-expected.json     # ground truth: 7 real_violations + 3 negative_controls
├── migrations/001_init.sql    # VULN-002
├── lib/
│   ├── db.ts                  # VULN-011 (VULN-001/013 corregidos)
│   ├── crypto.ts              # VULN-004 + trampa T3
│   ├── auth.ts                # (VULN-005/014 corregidos)
│   ├── mask.ts                # trampa T2
│   └── testCards.ts           # trampa T1
├── pages/
│   ├── index.tsx
│   └── api/
│       ├── payments/charge.ts       # VULN-003b (resto corregido)
│       ├── payments/[id].ts         # VULN-006 (VULN-017 corregido)
│       ├── payments/refund.ts       # (VULN-007/016 corregidos)
│       ├── webhooks/stripe.ts       # VULN-009
│       └── auth/login.ts            # (VULN-012/015 corregidos)
├── components/
│   ├── CheckoutForm.tsx        # (VULN-008 corregido)
│   └── AdminReconciliation.tsx # (VULN-010 corregido)
└── package.json                # VULN-LIB-001 (lodash 4.17.15)
```
