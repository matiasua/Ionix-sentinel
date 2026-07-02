// IONIX Sentinel — datos mock (portar a frontend/src/mocks/findings.ts)
// Esquema exacto: Finding (ver frontend/src/api/client.ts)

export const SCAN_ID = "scan_20260702_001";

export const findings = [
  {
    id: "fnd_001",
    ruleId: "SENTINEL-PAN-001",
    pciRequirement: "3.4",
    title: "PAN almacenado en texto plano en la base de datos",
    severity: "critical",
    source: "code",
    filePath: "migrations/001_init.sql",
    lineNumber: 12,
    snippet: `CREATE TABLE payments (
  id            SERIAL PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customers(id),
  card_number   VARCHAR(19) NOT NULL,
  card_holder   VARCHAR(120) NOT NULL,
  amount_clp    NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);`,
    explanation: "La columna card_number persiste el PAN completo sin cifrado ni tokenización. El requisito 3.4 de PCI-DSS exige que el PAN sea ilegible en cualquier lugar donde se almacene (truncamiento, hashing con salt, tokens o criptografía fuerte). Cualquier acceso a esta tabla —incluido un respaldo o un dump de desarrollo— expone datos de tarjeta en claro.",
    remediation: "Reemplace el almacenamiento del PAN por un token emitido por el proveedor de pagos o cifre la columna con AES-256 mediante una clave gestionada en un KMS. Si solo necesita los últimos 4 dígitos para visualización, almacene únicamente el PAN truncado (últimos 4) y elimine la columna original con una migración que sobrescriba los datos existentes.",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:14:22Z"
  },
  {
    id: "fnd_002",
    ruleId: "SENTINEL-KEY-003",
    pciRequirement: "3.5.1",
    title: "Clave de cifrado hardcodeada en el código fuente",
    severity: "critical",
    source: "code",
    filePath: "src/services/payment.ts",
    lineNumber: 47,
    snippet: `import crypto from "crypto";

const IV_LENGTH = 16;
const ENCRYPTION_KEY = "s3nt1n3l-2024-prod-key-do-not-share";

export function encryptCard(pan: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);`,
    explanation: "La clave de cifrado de datos de tarjeta está embebida como literal en el código y versionada en el repositorio. El requisito 3.5.1 exige proteger las claves criptográficas contra divulgación y uso indebido; una clave en el código es accesible para cualquier persona con acceso al repositorio y no puede rotarse sin un despliegue.",
    remediation: "Mueva la clave a un gestor de secretos (AWS KMS, Vault o variables de entorno inyectadas en despliegue) y elimínela del historial de git con una reescritura del repositorio. Rote la clave comprometida de inmediato, re-cifre los datos existentes con la clave nueva y documente el procedimiento de rotación periódica.",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:14:22Z"
  },
  {
    id: "fnd_003",
    ruleId: "SENTINEL-LOG-002",
    pciRequirement: "3.4",
    title: "PAN completo registrado en logs de aplicación",
    severity: "high",
    source: "log",
    filePath: "logs/payment-service.log",
    lineNumber: 4210,
    snippet: `2026-07-01T18:22:10Z INFO  charge.requested amount=45990 currency=CLP
2026-07-01T18:22:10Z DEBUG gateway.payload {"card":"4532015112830366","cvv_present":true}
2026-07-01T18:22:11Z INFO  charge.approved auth_code=88431
2026-07-01T18:22:11Z DEBUG customer.notify email=cliente@example.com`,
    explanation: "El log de nivel DEBUG serializa el payload completo enviado al gateway, incluyendo el PAN sin enmascarar. Los logs se replican a sistemas de observabilidad y respaldos fuera del entorno de datos de tarjeta, extendiendo el alcance PCI a toda la cadena de logging y violando el requisito 3.4.",
    remediation: "Implemente un filtro de sanitización en el logger que enmascare el PAN (mostrar solo BIN + últimos 4: 453201******0366) antes de escribir cualquier registro. Purgue los logs históricos que contienen PAN, verifique los índices del sistema de observabilidad y agregue un test que falle si un patrón de PAN aparece en la salida de logging.",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:14:25Z"
  },
  {
    id: "fnd_004",
    ruleId: "SENTINEL-INJ-001",
    pciRequirement: "6.5.1",
    title: "Inyección SQL en consulta de transacciones",
    severity: "high",
    source: "code",
    filePath: "src/repositories/transactions.ts",
    lineNumber: 88,
    snippet: `export async function findByCustomer(customerId: string, status: string) {
  const query =
    "SELECT * FROM transactions WHERE customer_id = '" + customerId +
    "' AND status = '" + status + "' ORDER BY created_at DESC";
  return db.raw(query);
}`,
    explanation: "La consulta concatena parámetros de entrada directamente en el SQL sin parametrización. El requisito 6.5.1 exige proteger las aplicaciones contra fallas de inyección; un atacante puede manipular customerId para extraer la tabla completa de transacciones o escalar hacia datos de tarjeta.",
    remediation: "Reescriba la consulta con parámetros preparados (db.raw con bindings o el query builder: db('transactions').where({customer_id, status})). Agregue validación de tipos en el borde de la API (customerId numérico) y una regla de lint que prohíba concatenación de strings en llamadas db.raw.",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:14:26Z"
  },
  {
    id: "fnd_005",
    ruleId: "SENTINEL-TLS-004",
    pciRequirement: "4.2.1",
    title: "TLS 1.0 y 1.1 habilitados en el servidor de pagos",
    severity: "high",
    source: "code",
    filePath: "nginx/payments.conf",
    lineNumber: 23,
    snippet: `server {
  listen 443 ssl;
  server_name pagos.internal.ionix.cl;
  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
  ssl_ciphers HIGH:!aNULL:!MD5;
}`,
    explanation: "La configuración acepta TLS 1.0 y 1.1, protocolos con vulnerabilidades conocidas (BEAST, POODLE) y explícitamente prohibidos para transmitir datos de tarjeta. El requisito 4.2.1 exige criptografía fuerte con protocolos seguros en cualquier transmisión de PAN por redes abiertas.",
    remediation: "Restrinja la directiva a ssl_protocols TLSv1.2 TLSv1.3 y actualice ssl_ciphers a suites AEAD modernas (ECDHE+AESGCM, CHACHA20). Valide con un escaneo externo (testssl.sh) que ningún endpoint del entorno de tarjeta negocie protocolos legados y monitoree clientes que fallen el handshake antes del corte.",
    status: "acknowledged",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:14:28Z"
  },
  {
    id: "fnd_006",
    ruleId: "SENTINEL-PWD-002",
    pciRequirement: "8.2.3",
    title: "Política de contraseñas bajo el mínimo exigido",
    severity: "medium",
    source: "code",
    filePath: "src/auth/password-policy.ts",
    lineNumber: 15,
    snippet: `export const passwordPolicy = {
  minLength: 6,
  requireUppercase: false,
  requireNumber: true,
  requireSymbol: false,
  maxAgeDays: 365,
};`,
    explanation: "La política acepta contraseñas de 6 caracteres sin mayúsculas ni símbolos. El requisito 8.2.3 (v3.2.1) exige un mínimo de 7 caracteres alfanuméricos, y PCI-DSS v4.0 (8.3.6) eleva el mínimo a 12 caracteres. Las credenciales débiles son el vector más frecuente de compromiso de cuentas con acceso al entorno de datos.",
    remediation: "Aumente minLength a 12, exija combinación de mayúsculas, números y símbolos, y reduzca maxAgeDays a 90 para cuentas con acceso al CDE. Aplique la política nueva en el próximo cambio de contraseña de cada usuario y verifique contra listas de contraseñas comprometidas (haveibeenpwned u otra fuente k-anonymity).",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:14:30Z"
  },
  {
    id: "fnd_007",
    ruleId: "SENTINEL-SES-001",
    pciRequirement: "6.5.10",
    title: "Cookie de sesión sin flags Secure y HttpOnly",
    severity: "medium",
    source: "code",
    filePath: "src/middleware/session.ts",
    lineNumber: 31,
    snippet: `app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  cookie: { secure: false, httpOnly: false, maxAge: 86400000 },
}));`,
    explanation: "La cookie de sesión viaja sin el flag Secure (transmisible por HTTP plano) y sin HttpOnly (accesible desde JavaScript). El requisito 6.5.10 cubre la gestión defectuosa de autenticación y sesiones; en un entorno con XSS o red no confiable el token de sesión queda expuesto a robo.",
    remediation: "Configure cookie: { secure: true, httpOnly: true, sameSite: 'lax' } y sirva la aplicación exclusivamente por HTTPS. Reduzca maxAge a la ventana mínima operativa (15 minutos de inactividad según 8.2.8) y regenere el identificador de sesión tras cada autenticación.",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:14:31Z"
  },
  {
    id: "fnd_008",
    ruleId: "SENTINEL-DEP-005",
    pciRequirement: "6.3.3",
    title: "Dependencia con vulnerabilidad crítica conocida (lodash 4.17.15)",
    severity: "medium",
    source: "code",
    filePath: "package.json",
    lineNumber: 24,
    snippet: `  "dependencies": {
    "express": "^4.18.2",
    "lodash": "4.17.15",
    "pg": "^8.11.0",
    "winston": "^3.10.0"
  },`,
    explanation: "lodash 4.17.15 tiene vulnerabilidades publicadas de prototype pollution (CVE-2020-8203) y command injection (CVE-2021-23337). El requisito 6.3.3 exige instalar parches de seguridad dentro del mes posterior a su publicación para componentes críticos; la versión fijada impide recibir el parche.",
    remediation: "Actualice a lodash ^4.17.21 (o elimine la dependencia si solo usa utilidades reemplazables por JS nativo). Incorpore npm audit o Dependabot al pipeline CI con umbral de falla en severidad alta, para que las dependencias vulnerables bloqueen el merge en lugar de llegar a producción.",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:14:33Z"
  },
  {
    id: "fnd_009",
    ruleId: "SENTINEL-SES-003",
    pciRequirement: "8.2.8",
    title: "Timeout de sesión de 24 horas en consola administrativa",
    severity: "medium",
    source: "code",
    filePath: "src/admin/config.ts",
    lineNumber: 9,
    snippet: `export const adminConfig = {
  sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24h
  allowRememberMe: true,
  mfaRequired: false,
};`,
    explanation: "La sesión administrativa permanece válida 24 horas sin actividad. El requisito 8.2.8 exige re-autenticación tras un máximo de 15 minutos de inactividad para sesiones con acceso a componentes del entorno de datos; una consola admin abierta y desatendida es acceso directo no supervisado.",
    remediation: "Reduzca sessionTimeoutMs a 15 minutos de inactividad con renovación por actividad legítima, deshabilite allowRememberMe para roles administrativos y active mfaRequired: true (el requisito 8.4.1 exige MFA para todo acceso administrativo al CDE).",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:14:34Z"
  },
  {
    id: "fnd_010",
    ruleId: "SENTINEL-HDR-001",
    pciRequirement: "2.2.5",
    title: "Versión del servidor expuesta en headers HTTP",
    severity: "low",
    source: "log",
    filePath: "logs/edge-proxy.log",
    lineNumber: 1187,
    snippet: `2026-07-01T12:03:44Z GET /api/health 200
< Server: nginx/1.18.0 (Ubuntu)
< X-Powered-By: Express
2026-07-01T12:03:45Z GET /api/version 200`,
    explanation: "Las respuestas HTTP exponen versión exacta de nginx y el framework de aplicación. El requisito 2.2.5 pide eliminar funcionalidad innecesaria e información que facilite el reconocimiento; conocer la versión permite a un atacante buscar exploits específicos sin esfuerzo de fingerprinting.",
    remediation: "Configure server_tokens off en nginx y app.disable('x-powered-by') en Express. Verifique con curl -I sobre todos los endpoints públicos que ningún header revele versiones de software y agregue esta comprobación al smoke test post-despliegue.",
    status: "open",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:14:36Z"
  },
  {
    id: "fnd_011",
    ruleId: "SENTINEL-LOG-006",
    pciRequirement: "10.6.1",
    title: "Logs de auditoría sin sincronización horaria (NTP)",
    severity: "low",
    source: "code",
    filePath: "docker-compose.yml",
    lineNumber: 41,
    snippet: `  audit-worker:
    image: ionix/audit-worker:latest
    environment:
      - TZ=America/Santiago
    # sin volumen /etc/ntp.conf ni servicio de sincronización`,
    explanation: "El contenedor de auditoría no sincroniza su reloj contra una fuente NTP confiable. El requisito 10.6.1 exige tecnología de sincronización horaria para correlacionar eventos entre sistemas; sin ella, los timestamps de auditoría no son confiables como evidencia forense ni para reconstruir incidentes.",
    remediation: "Configure el host Docker con chrony apuntando a servidores NTP internos autenticados y monte el reloj del host en los contenedores (los contenedores heredan el reloj del kernel del host). Documente la fuente de tiempo en el inventario PCI y alerte si la deriva supera 1 segundo.",
    status: "resolved",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:14:37Z"
  },
  {
    id: "fnd_012",
    ruleId: "SENTINEL-DBG-002",
    pciRequirement: "6.5.5",
    title: "Stack traces detallados devueltos al cliente en errores 500",
    severity: "low",
    source: "code",
    filePath: "src/middleware/error-handler.ts",
    lineNumber: 18,
    snippet: `export function errorHandler(err, req, res, next) {
  res.status(500).json({
    message: err.message,
    stack: err.stack,
    query: req.query,
  });
}`,
    explanation: "El manejador de errores serializa el stack trace completo y los parámetros de la request hacia el cliente. El requisito 6.5.5 cubre el manejo inapropiado de errores: los stack traces revelan rutas internas, versiones de librerías y estructura del código, información útil para dirigir un ataque.",
    remediation: "Devuelva al cliente un mensaje genérico con un identificador de correlación (res.status(500).json({ error: 'internal_error', traceId })) y registre el detalle completo solo en el log del servidor. Asegure que NODE_ENV=production desactive cualquier modo verbose de error en frameworks y ORMs.",
    status: "false_positive",
    scanId: "scan_20260702_001",
    createdAt: "2026-07-02T09:14:38Z"
  }
];

// Línea inicial de cada snippet (para numerar y resaltar lineNumber en CodeSnippet)
export const snippetStart = {
  fnd_001: 9,
  fnd_002: 44,
  fnd_003: 4209,
  fnd_004: 87,
  fnd_005: 20,
  fnd_006: 14,
  fnd_007: 29,
  fnd_008: 22,
  fnd_009: 7,
  fnd_010: 1186,
  fnd_011: 38,
  fnd_012: 16
};
