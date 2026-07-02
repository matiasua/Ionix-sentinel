INSERT INTO public.findings (id,title,severity,pci_requirement,"source",rule_id,file_path,line_number,snippet,explanation,remediation,reasoning_status,status,scan_id,created_at) VALUES
	 ('8b2f2722-c008-4696-bbec-786e4cac12bf'::uuid,'PAN almacenad en texto plano en la base de datos','critical','3.4','code','SENTINEL-PAN-001','migrations/001_init.sql',12,'CREATE TABLE payments (
  id            SERIAL PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customers(id),
  card_number   VARCHAR(19) NOT NULL,
  card_holder   VARCHAR(120) NOT NULL,
  amount_clp    NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);','La columna card_number persiste el PAN completo sin cifrado ni tokenización. El requisito 3.4 de PCI-DSS exige que el PAN sea ilegible en cualquier lugar donde se almacene (truncamiento, hashing con salt, tokens o criptografía fuerte). Cualquier acceso a esta tabla —incluido un respaldo o un dump de desarrollo— expone datos de tarjeta en claro.','Reemplace el almacenamiento del PAN por un token emitido por el proveedor de pagos o cifre la columna con AES-256 mediante una clave gestionada en un KMS. Si solo necesita los últimos 4 dígitos para visualización, almacene únicamente el PAN truncado (últimos 4) y elimine la columna original con una migración que sobrescriba los datos existentes.','ok','open','scan_1783028301084','2026-07-02 17:38:21.087'),
	 ('2f2e8f5b-5ad7-435a-b2ac-9653de5b10ca'::uuid,'PAN completo registrado en logs de aplicación','high','3.4','log','SENTINEL-LOG-002','logs/payment-service.log',4210,'2026-07-01T18:22:10Z INFO  charge.requested amount=45990 currency=CLP
2026-07-01T18:22:10Z DEBUG gateway.payload {"card":"4532015112830366","cvv_present":true}
2026-07-01T18:22:11Z INFO  charge.approved auth_code=88431
2026-07-01T18:22:11Z DEBUG customer.notify email=cliente@example.com','El log de nivel DEBUG serializa el payload completo enviado al gateway, incluyendo el PAN sin enmascarar. Los logs se replican a sistemas de observabilidad y respaldos fuera del entorno de datos de tarjeta, extendiendo el alcance PCI a toda la cadena de logging y violando el requisito 3.4.','Implemente un filtro de sanitización en el logger que enmascare el PAN (mostrar solo BIN + últimos 4: 453201******0366) antes de escribir cualquier registro. Purgue los logs históricos que contienen PAN, verifique los índices del sistema de observabilidad y agregue un test que falle si un patrón de PAN aparece en la salida de logging.','ok','open','scan_1783028301084','2026-07-02 17:38:21.095'),
	 ('06a0995b-68a9-4710-bcd9-7a0a6dacc167'::uuid,'Inyección SQL en consulta de transacciones','high','6.5.1','code','SENTINEL-INJ-001','src/repositories/transactions.ts',88,'export async function findByCustomer(customerId: string, status: string) {
  const query =
    "SELECT * FROM transactions WHERE customer_id = ''" + customerId +
    "'' AND status = ''" + status + "'' ORDER BY created_at DESC";
  return db.raw(query);
}','La consulta concatena parámetros de entrada directamente en el SQL sin parametrización. El requisito 6.5.1 exige proteger las aplicaciones contra fallas de inyección; un atacante puede manipular customerId para extraer la tabla completa de transacciones o escalar hacia datos de tarjeta.','Reescriba la consulta con parámetros preparados (db.raw con bindings o el query builder: db(''transactions'').where({customer_id, status})). Agregue validación de tipos en el borde de la API (customerId numérico) y una regla de lint que prohíba concatenación de strings en llamadas db.raw.','ok','open','scan_1783028301084','2026-07-02 17:38:21.097'),
	 ('b511611a-6f44-47ac-ab14-80f45e650452'::uuid,'TLS 1.0 y 1.1 habilitados en el servidor de pagos','high','4.2.1','code','SENTINEL-TLS-004','nginx/payments.conf',23,'server {
  listen 443 ssl;
  server_name pagos.internal.ionix.cl;
  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
  ssl_ciphers HIGH:!aNULL:!MD5;
}','La configuración acepta TLS 1.0 y 1.1, protocolos con vulnerabilidades conocidas (BEAST, POODLE) y explícitamente prohibidos para transmitir datos de tarjeta. El requisito 4.2.1 exige criptografía fuerte con protocolos seguros en cualquier transmisión de PAN por redes abiertas.','Restrinja la directiva a ssl_protocols TLSv1.2 TLSv1.3 y actualice ssl_ciphers a suites AEAD modernas (ECDHE+AESGCM, CHACHA20). Valide con un escaneo externo (testssl.sh) que ningún endpoint del entorno de tarjeta negocie protocolos legados y monitoree clientes que fallen el handshake antes del corte.','ok','acknowledged','scan_1783028301084','2026-07-02 17:38:21.098'),
	 ('40ca2baa-5465-4c8e-a37d-24c19235e451'::uuid,'Política de contraseñas bajo el mínimo exigido','medium','8.2.3','code','SENTINEL-PWD-002','src/auth/password-policy.ts',15,'export const passwordPolicy = {
  minLength: 6,
  requireUppercase: false,
  requireNumber: true,
  requireSymbol: false,
  maxAgeDays: 365,
};','La política acepta contraseñas de 6 caracteres sin mayúsculas ni símbolos. El requisito 8.2.3 (v3.2.1) exige un mínimo de 7 caracteres alfanuméricos, y PCI-DSS v4.0 (8.3.6) eleva el mínimo a 12 caracteres. Las credenciales débiles son el vector más frecuente de compromiso de cuentas con acceso al entorno de datos.','Aumente minLength a 12, exija combinación de mayúsculas, números y símbolos, y reduzca maxAgeDays a 90 para cuentas con acceso al CDE. Aplique la política nueva en el próximo cambio de contraseña de cada usuario y verifique contra listas de contraseñas comprometidas (haveibeenpwned u otra fuente k-anonymity).','ok','open','scan_1783028301084','2026-07-02 17:38:21.099'),
	 ('e2b69f95-5cfa-4495-bb98-335ec373e400'::uuid,'Cookie de sesión sin flags Secure y HttpOnly','medium','6.5.10','code','SENTINEL-SES-001','src/middleware/session.ts',31,'app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  cookie: { secure: false, httpOnly: false, maxAge: 86400000 },
}));','La cookie de sesión viaja sin el flag Secure (transmisible por HTTP plano) y sin HttpOnly (accesible desde JavaScript). El requisito 6.5.10 cubre la gestión defectuosa de autenticación y sesiones; en un entorno con XSS o red no confiable el token de sesión queda expuesto a robo.','Configure cookie: { secure: true, httpOnly: true, sameSite: ''lax'' } y sirva la aplicación exclusivamente por HTTPS. Reduzca maxAge a la ventana mínima operativa (15 minutos de inactividad según 8.2.8) y regenere el identificador de sesión tras cada autenticación.','ok','open','scan_1783028301084','2026-07-02 17:38:21.100'),
	 ('1c4f9c04-7704-491b-a5b1-18745c46e0f4'::uuid,'Dependencia con vulnerabilidad crítica conocida (lodash 4.17.15)','medium','6.3.3','code','SENTINEL-DEP-005','package.json',24,'  "dependencies": {
    "express": "^4.18.2",
    "lodash": "4.17.15",
    "pg": "^8.11.0",
    "winston": "^3.10.0"
  },','lodash 4.17.15 tiene vulnerabilidades publicadas de prototype pollution (CVE-2020-8203) y command injection (CVE-2021-23337). El requisito 6.3.3 exige instalar parches de seguridad dentro del mes posterior a su publicación para componentes críticos; la versión fijada impide recibir el parche.','Actualice a lodash ^4.17.21 (o elimine la dependencia si solo usa utilidades reemplazables por JS nativo). Incorpore npm audit o Dependabot al pipeline CI con umbral de falla en severidad alta, para que las dependencias vulnerables bloqueen el merge en lugar de llegar a producción.','ok','open','scan_1783028301084','2026-07-02 17:38:21.102'),
	 ('7fdf8cbe-19ca-454f-8897-8d4b8b6baeca'::uuid,'Timeout de sesión de 24 horas en consola administrativa','medium','8.2.8','code','SENTINEL-SES-003','src/admin/config.ts',9,'export const adminConfig = {
  sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24h
  allowRememberMe: true,
  mfaRequired: false,
};','La sesión administrativa permanece válida 24 horas sin actividad. El requisito 8.2.8 exige re-autenticación tras un máximo de 15 minutos de inactividad para sesiones con acceso a componentes del entorno de datos; una consola admin abierta y desatendida es acceso directo no supervisado.','Reduzca sessionTimeoutMs a 15 minutos de inactividad con renovación por actividad legítima, deshabilite allowRememberMe para roles administrativos y active mfaRequired: true (el requisito 8.4.1 exige MFA para todo acceso administrativo al CDE).','ok','open','scan_1783028301084','2026-07-02 17:38:21.103'),
	 ('c3e749fa-2791-40b7-8b1c-f48ba39182fc'::uuid,'Versión del servidor expuesta en headers HTTP','low','2.2.5','log','SENTINEL-HDR-001','logs/edge-proxy.log',1187,'2026-07-01T12:03:44Z GET /api/health 200
< Server: nginx/1.18.0 (Ubuntu)
< X-Powered-By: Express
2026-07-01T12:03:45Z GET /api/version 200','Las respuestas HTTP exponen versión exacta de nginx y el framework de aplicación. El requisito 2.2.5 pide eliminar funcionalidad innecesaria e información que facilite el reconocimiento; conocer la versión permite a un atacante buscar exploits específicos sin esfuerzo de fingerprinting.','Configure server_tokens off en nginx y app.disable(''x-powered-by'') en Express. Verifique con curl -I sobre todos los endpoints públicos que ningún header revele versiones de software y agregue esta comprobación al smoke test post-despliegue.','ok','open','scan_1783028301084','2026-07-02 17:38:21.105'),
	 ('7488ec88-6dd6-4e0b-9ee9-c70d54dd14a3'::uuid,'Logs de auditoría sin sincronización horaria (NTP)','low','10.6.1','code','SENTINEL-LOG-006','docker-compose.yml',41,'  audit-worker:
    image: ionix/audit-worker:latest
    environment:
      - TZ=America/Santiago
    # sin volumen /etc/ntp.conf ni servicio de sincronización','El contenedor de auditoría no sincroniza su reloj contra una fuente NTP confiable. El requisito 10.6.1 exige tecnología de sincronización horaria para correlacionar eventos entre sistemas; sin ella, los timestamps de auditoría no son confiables como evidencia forense ni para reconstruir incidentes.','Configure el host Docker con chrony apuntando a servidores NTP internos autenticados y monte el reloj del host en los contenedores (los contenedores heredan el reloj del kernel del host). Documente la fuente de tiempo en el inventario PCI y alerte si la deriva supera 1 segundo.','ok','resolved','scan_1783028301084','2026-07-02 17:38:21.106');
INSERT INTO public.findings (id,title,severity,pci_requirement,"source",rule_id,file_path,line_number,snippet,explanation,remediation,reasoning_status,status,scan_id,created_at) VALUES
	 ('f2df867b-6dbf-42b4-af27-30f4e0a8abee'::uuid,'Stack traces detallados devueltos al cliente en errores 500','low','6.5.5','code','SENTINEL-DBG-002','src/middleware/error-handler.ts',18,'export function errorHandler(err, req, res, next) {
  res.status(500).json({
    message: err.message,
    stack: err.stack,
    query: req.query,
  });
}','El manejador de errores serializa el stack trace completo y los parámetros de la request hacia el cliente. El requisito 6.5.5 cubre el manejo inapropiado de errores: los stack traces revelan rutas internas, versiones de librerías y estructura del código, información útil para dirigir un ataque.','Devuelva al cliente un mensaje genérico con un identificador de correlación (res.status(500).json({ error: ''internal_error'', traceId })) y registre el detalle completo solo en el log del servidor. Asegure que NODE_ENV=production desactive cualquier modo verbose de error en frameworks y ORMs.','ok','false_positive','scan_1783028301084','2026-07-02 17:38:21.107'),
	 ('67d39b2d-93d6-464c-b41c-97b7240ab013'::uuid,'Clave de cifrado hardcodeada en el código fuente','critical','3.5.1','code','SENTINEL-KEY-003','src/services/payment.ts',47,'import crypto from "crypto";

const IV_LENGTH = 16;
const ENCRYPTION_KEY = "s3nt1n3l-2024-prod-key-do-not-share";

export function encryptCard(pan: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);','La clave de cifrado de datos de tarjeta está embebida como literal en el código y versionada en el repositorio. El requisito 3.5.1 exige proteger las claves criptográficas contra divulgación y uso indebido; una clave en el código es accesible para cualquier persona con acceso al repositorio y no puede rotarse sin un despliegue.','Mueva la clave a un gestor de secretos (AWS KMS, Vault o variables de entorno inyectadas en despliegue) y elimínela del historial de git con una reescritura del repositorio. Rote la clave comprometida de inmediato, re-cifre los datos existentes con la clave nueva y documente el procedimiento de rotación periódica.','ok','acknowledged','scan_1783028301084','2026-07-02 17:38:21.094'),
	 ('ab6a3e39-2dd2-41ea-9dd9-80b5c40df091'::uuid,'PAN almacenado en texto plano en la base de datos','critical','3.4','code','SENTINEL-PAN-001','migrations/001_init.sql',12,'CREATE TABLE payments (
  id            SERIAL PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customers(id),
  card_number   VARCHAR(19) NOT NULL,
  card_holder   VARCHAR(120) NOT NULL,
  amount_clp    NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);','La columna card_number persiste el PAN completo sin cifrado ni tokenización. El requisito 3.4 de PCI-DSS exige que el PAN sea ilegible en cualquier lugar donde se almacene (truncamiento, hashing con salt, tokens o criptografía fuerte). Cualquier acceso a esta tabla —incluido un respaldo o un dump de desarrollo— expone datos de tarjeta en claro.','Reemplace el almacenamiento del PAN por un token emitido por el proveedor de pagos o cifre la columna con AES-256 mediante una clave gestionada en un KMS. Si solo necesita los últimos 4 dígitos para visualización, almacene únicamente el PAN truncado (últimos 4) y elimine la columna original con una migración que sobrescriba los datos existentes.','ok','open','scan_1783028447138','2026-07-02 17:40:47.138'),
	 ('3e930550-b839-42a9-a4c7-e9e649e8ebc6'::uuid,'PAN completo registrado en logs de aplicación','high','3.4','log','SENTINEL-LOG-002','logs/payment-service.log',4210,'2026-07-01T18:22:10Z INFO  charge.requested amount=45990 currency=CLP
2026-07-01T18:22:10Z DEBUG gateway.payload {"card":"4532015112830366","cvv_present":true}
2026-07-01T18:22:11Z INFO  charge.approved auth_code=88431
2026-07-01T18:22:11Z DEBUG customer.notify email=cliente@example.com','El log de nivel DEBUG serializa el payload completo enviado al gateway, incluyendo el PAN sin enmascarar. Los logs se replican a sistemas de observabilidad y respaldos fuera del entorno de datos de tarjeta, extendiendo el alcance PCI a toda la cadena de logging y violando el requisito 3.4.','Implemente un filtro de sanitización en el logger que enmascare el PAN (mostrar solo BIN + últimos 4: 453201******0366) antes de escribir cualquier registro. Purgue los logs históricos que contienen PAN, verifique los índices del sistema de observabilidad y agregue un test que falle si un patrón de PAN aparece en la salida de logging.','ok','open','scan_1783028447138','2026-07-02 17:40:47.147'),
	 ('e57aa54e-8271-41c7-9cb0-3beff2ce8fad'::uuid,'Inyección SQL en consulta de transacciones','high','6.5.1','code','SENTINEL-INJ-001','src/repositories/transactions.ts',88,'export async function findByCustomer(customerId: string, status: string) {
  const query =
    "SELECT * FROM transactions WHERE customer_id = ''" + customerId +
    "'' AND status = ''" + status + "'' ORDER BY created_at DESC";
  return db.raw(query);
}','La consulta concatena parámetros de entrada directamente en el SQL sin parametrización. El requisito 6.5.1 exige proteger las aplicaciones contra fallas de inyección; un atacante puede manipular customerId para extraer la tabla completa de transacciones o escalar hacia datos de tarjeta.','Reescriba la consulta con parámetros preparados (db.raw con bindings o el query builder: db(''transactions'').where({customer_id, status})). Agregue validación de tipos en el borde de la API (customerId numérico) y una regla de lint que prohíba concatenación de strings en llamadas db.raw.','ok','open','scan_1783028447138','2026-07-02 17:40:47.149'),
	 ('d7648dc1-9b29-464c-ad75-a7b102168320'::uuid,'TLS 1.0 y 1.1 habilitados en el servidor de pagos','high','4.2.1','code','SENTINEL-TLS-004','nginx/payments.conf',23,'server {
  listen 443 ssl;
  server_name pagos.internal.ionix.cl;
  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
  ssl_ciphers HIGH:!aNULL:!MD5;
}','La configuración acepta TLS 1.0 y 1.1, protocolos con vulnerabilidades conocidas (BEAST, POODLE) y explícitamente prohibidos para transmitir datos de tarjeta. El requisito 4.2.1 exige criptografía fuerte con protocolos seguros en cualquier transmisión de PAN por redes abiertas.','Restrinja la directiva a ssl_protocols TLSv1.2 TLSv1.3 y actualice ssl_ciphers a suites AEAD modernas (ECDHE+AESGCM, CHACHA20). Valide con un escaneo externo (testssl.sh) que ningún endpoint del entorno de tarjeta negocie protocolos legados y monitoree clientes que fallen el handshake antes del corte.','ok','acknowledged','scan_1783028447138','2026-07-02 17:40:47.150'),
	 ('bafe33ed-1e74-4f32-b764-7af048f786ed'::uuid,'Política de contraseñas bajo el mínimo exigido','medium','8.2.3','code','SENTINEL-PWD-002','src/auth/password-policy.ts',15,'export const passwordPolicy = {
  minLength: 6,
  requireUppercase: false,
  requireNumber: true,
  requireSymbol: false,
  maxAgeDays: 365,
};','La política acepta contraseñas de 6 caracteres sin mayúsculas ni símbolos. El requisito 8.2.3 (v3.2.1) exige un mínimo de 7 caracteres alfanuméricos, y PCI-DSS v4.0 (8.3.6) eleva el mínimo a 12 caracteres. Las credenciales débiles son el vector más frecuente de compromiso de cuentas con acceso al entorno de datos.','Aumente minLength a 12, exija combinación de mayúsculas, números y símbolos, y reduzca maxAgeDays a 90 para cuentas con acceso al CDE. Aplique la política nueva en el próximo cambio de contraseña de cada usuario y verifique contra listas de contraseñas comprometidas (haveibeenpwned u otra fuente k-anonymity).','ok','open','scan_1783028447138','2026-07-02 17:40:47.151'),
	 ('7178c429-da1c-46af-bd98-5c76e88bf133'::uuid,'Cookie de sesión sin flags Secure y HttpOnly','medium','6.5.10','code','SENTINEL-SES-001','src/middleware/session.ts',31,'app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  cookie: { secure: false, httpOnly: false, maxAge: 86400000 },
}));','La cookie de sesión viaja sin el flag Secure (transmisible por HTTP plano) y sin HttpOnly (accesible desde JavaScript). El requisito 6.5.10 cubre la gestión defectuosa de autenticación y sesiones; en un entorno con XSS o red no confiable el token de sesión queda expuesto a robo.','Configure cookie: { secure: true, httpOnly: true, sameSite: ''lax'' } y sirva la aplicación exclusivamente por HTTPS. Reduzca maxAge a la ventana mínima operativa (15 minutos de inactividad según 8.2.8) y regenere el identificador de sesión tras cada autenticación.','ok','open','scan_1783028447138','2026-07-02 17:40:47.152'),
	 ('98c2d359-ac55-42c7-88fd-89077875d786'::uuid,'Dependencia con vulnerabilidad crítica conocida (lodash 4.17.15)','medium','6.3.3','code','SENTINEL-DEP-005','package.json',24,'  "dependencies": {
    "express": "^4.18.2",
    "lodash": "4.17.15",
    "pg": "^8.11.0",
    "winston": "^3.10.0"
  },','lodash 4.17.15 tiene vulnerabilidades publicadas de prototype pollution (CVE-2020-8203) y command injection (CVE-2021-23337). El requisito 6.3.3 exige instalar parches de seguridad dentro del mes posterior a su publicación para componentes críticos; la versión fijada impide recibir el parche.','Actualice a lodash ^4.17.21 (o elimine la dependencia si solo usa utilidades reemplazables por JS nativo). Incorpore npm audit o Dependabot al pipeline CI con umbral de falla en severidad alta, para que las dependencias vulnerables bloqueen el merge en lugar de llegar a producción.','ok','open','scan_1783028447138','2026-07-02 17:40:47.153'),
	 ('a3399b71-cd8e-4d72-a0c2-dad4a6c9d367'::uuid,'Timeout de sesión de 24 horas en consola administrativa','medium','8.2.8','code','SENTINEL-SES-003','src/admin/config.ts',9,'export const adminConfig = {
  sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24h
  allowRememberMe: true,
  mfaRequired: false,
};','La sesión administrativa permanece válida 24 horas sin actividad. El requisito 8.2.8 exige re-autenticación tras un máximo de 15 minutos de inactividad para sesiones con acceso a componentes del entorno de datos; una consola admin abierta y desatendida es acceso directo no supervisado.','Reduzca sessionTimeoutMs a 15 minutos de inactividad con renovación por actividad legítima, deshabilite allowRememberMe para roles administrativos y active mfaRequired: true (el requisito 8.4.1 exige MFA para todo acceso administrativo al CDE).','ok','open','scan_1783028447138','2026-07-02 17:40:47.153');
INSERT INTO public.findings (id,title,severity,pci_requirement,"source",rule_id,file_path,line_number,snippet,explanation,remediation,reasoning_status,status,scan_id,created_at) VALUES
	 ('d38f79bd-3d78-4e37-9220-416f34a9bb15'::uuid,'Versión del servidor expuesta en headers HTTP','low','2.2.5','log','SENTINEL-HDR-001','logs/edge-proxy.log',1187,'2026-07-01T12:03:44Z GET /api/health 200
< Server: nginx/1.18.0 (Ubuntu)
< X-Powered-By: Express
2026-07-01T12:03:45Z GET /api/version 200','Las respuestas HTTP exponen versión exacta de nginx y el framework de aplicación. El requisito 2.2.5 pide eliminar funcionalidad innecesaria e información que facilite el reconocimiento; conocer la versión permite a un atacante buscar exploits específicos sin esfuerzo de fingerprinting.','Configure server_tokens off en nginx y app.disable(''x-powered-by'') en Express. Verifique con curl -I sobre todos los endpoints públicos que ningún header revele versiones de software y agregue esta comprobación al smoke test post-despliegue.','ok','open','scan_1783028447138','2026-07-02 17:40:47.154'),
	 ('a2800607-e904-4a5d-92f2-f9549fe40488'::uuid,'Logs de auditoría sin sincronización horaria (NTP)','low','10.6.1','code','SENTINEL-LOG-006','docker-compose.yml',41,'  audit-worker:
    image: ionix/audit-worker:latest
    environment:
      - TZ=America/Santiago
    # sin volumen /etc/ntp.conf ni servicio de sincronización','El contenedor de auditoría no sincroniza su reloj contra una fuente NTP confiable. El requisito 10.6.1 exige tecnología de sincronización horaria para correlacionar eventos entre sistemas; sin ella, los timestamps de auditoría no son confiables como evidencia forense ni para reconstruir incidentes.','Configure el host Docker con chrony apuntando a servidores NTP internos autenticados y monte el reloj del host en los contenedores (los contenedores heredan el reloj del kernel del host). Documente la fuente de tiempo en el inventario PCI y alerte si la deriva supera 1 segundo.','ok','resolved','scan_1783028447138','2026-07-02 17:40:47.155'),
	 ('7abf215e-4cf1-4599-9e10-6ca8a5f0df04'::uuid,'Stack traces detallados devueltos al cliente en errores 500','low','6.5.5','code','SENTINEL-DBG-002','src/middleware/error-handler.ts',18,'export function errorHandler(err, req, res, next) {
  res.status(500).json({
    message: err.message,
    stack: err.stack,
    query: req.query,
  });
}','El manejador de errores serializa el stack trace completo y los parámetros de la request hacia el cliente. El requisito 6.5.5 cubre el manejo inapropiado de errores: los stack traces revelan rutas internas, versiones de librerías y estructura del código, información útil para dirigir un ataque.','Devuelva al cliente un mensaje genérico con un identificador de correlación (res.status(500).json({ error: ''internal_error'', traceId })) y registre el detalle completo solo en el log del servidor. Asegure que NODE_ENV=production desactive cualquier modo verbose de error en frameworks y ORMs.','ok','false_positive','scan_1783028447138','2026-07-02 17:40:47.155'),
	 ('cd652b87-9919-4786-9dcc-6000919ec6fa'::uuid,'Clave de cifrado hardcodeada en el código fuente','critical','3.5.1','code','SENTINEL-KEY-003','src/services/payment.ts',47,'import crypto from "crypto";

const IV_LENGTH = 16;
const ENCRYPTION_KEY = "s3nt1n3l-2024-prod-key-do-not-share";

export function encryptCard(pan: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);','La clave de cifrado de datos de tarjeta está embebida como literal en el código y versionada en el repositorio. El requisito 3.5.1 exige proteger las claves criptográficas contra divulgación y uso indebido; una clave en el código es accesible para cualquier persona con acceso al repositorio y no puede rotarse sin un despliegue.','Mueva la clave a un gestor de secretos (AWS KMS, Vault o variables de entorno inyectadas en despliegue) y elimínela del historial de git con una reescritura del repositorio. Rote la clave comprometida de inmediato, re-cifre los datos existentes con la clave nueva y documente el procedimiento de rotación periódica.','ok','resolved','scan_1783028447138','2026-07-02 17:40:47.145'),
	 ('89606744-c69f-48e0-9318-b3abe5d2b7aa'::uuid,'PAN almacenado en texto plano en la base de datos','critical','3.4','code','SENTINEL-PAN-001','migrations/001_init.sql',12,'CREATE TABLE payments (
  id            SERIAL PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customers(id),
  card_number   VARCHAR(19) NOT NULL,
  card_holder   VARCHAR(120) NOT NULL,
  amount_clp    NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);','La columna card_number persiste el PAN completo sin cifrado ni tokenización. El requisito 3.4 de PCI-DSS exige que el PAN sea ilegible en cualquier lugar donde se almacene (truncamiento, hashing con salt, tokens o criptografía fuerte). Cualquier acceso a esta tabla —incluido un respaldo o un dump de desarrollo— expone datos de tarjeta en claro.','Reemplace el almacenamiento del PAN por un token emitido por el proveedor de pagos o cifre la columna con AES-256 mediante una clave gestionada en un KMS. Si solo necesita los últimos 4 dígitos para visualización, almacene únicamente el PAN truncado (últimos 4) y elimine la columna original con una migración que sobrescriba los datos existentes.','ok','open','scan_1783029876975','2026-07-02 18:04:36.975'),
	 ('866eb6a1-2790-4557-b472-08fe13cecde8'::uuid,'PAN completo registrado en logs de aplicación','high','3.4','log','SENTINEL-LOG-002','logs/payment-service.log',4210,'2026-07-01T18:22:10Z INFO  charge.requested amount=45990 currency=CLP
2026-07-01T18:22:10Z DEBUG gateway.payload {"card":"4532015112830366","cvv_present":true}
2026-07-01T18:22:11Z INFO  charge.approved auth_code=88431
2026-07-01T18:22:11Z DEBUG customer.notify email=cliente@example.com','El log de nivel DEBUG serializa el payload completo enviado al gateway, incluyendo el PAN sin enmascarar. Los logs se replican a sistemas de observabilidad y respaldos fuera del entorno de datos de tarjeta, extendiendo el alcance PCI a toda la cadena de logging y violando el requisito 3.4.','Implemente un filtro de sanitización en el logger que enmascare el PAN (mostrar solo BIN + últimos 4: 453201******0366) antes de escribir cualquier registro. Purgue los logs históricos que contienen PAN, verifique los índices del sistema de observabilidad y agregue un test que falle si un patrón de PAN aparece en la salida de logging.','ok','open','scan_1783029876975','2026-07-02 18:04:36.982'),
	 ('9a568985-7be6-40aa-a2c3-7d1295b04a46'::uuid,'Inyección SQL en consulta de transacciones','high','6.5.1','code','SENTINEL-INJ-001','src/repositories/transactions.ts',88,'export async function findByCustomer(customerId: string, status: string) {
  const query =
    "SELECT * FROM transactions WHERE customer_id = ''" + customerId +
    "'' AND status = ''" + status + "'' ORDER BY created_at DESC";
  return db.raw(query);
}','La consulta concatena parámetros de entrada directamente en el SQL sin parametrización. El requisito 6.5.1 exige proteger las aplicaciones contra fallas de inyección; un atacante puede manipular customerId para extraer la tabla completa de transacciones o escalar hacia datos de tarjeta.','Reescriba la consulta con parámetros preparados (db.raw con bindings o el query builder: db(''transactions'').where({customer_id, status})). Agregue validación de tipos en el borde de la API (customerId numérico) y una regla de lint que prohíba concatenación de strings en llamadas db.raw.','ok','open','scan_1783029876975','2026-07-02 18:04:36.982'),
	 ('e4e61c36-228f-49d3-82cb-2b5587d3082a'::uuid,'TLS 1.0 y 1.1 habilitados en el servidor de pagos','high','4.2.1','code','SENTINEL-TLS-004','nginx/payments.conf',23,'server {
  listen 443 ssl;
  server_name pagos.internal.ionix.cl;
  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
  ssl_ciphers HIGH:!aNULL:!MD5;
}','La configuración acepta TLS 1.0 y 1.1, protocolos con vulnerabilidades conocidas (BEAST, POODLE) y explícitamente prohibidos para transmitir datos de tarjeta. El requisito 4.2.1 exige criptografía fuerte con protocolos seguros en cualquier transmisión de PAN por redes abiertas.','Restrinja la directiva a ssl_protocols TLSv1.2 TLSv1.3 y actualice ssl_ciphers a suites AEAD modernas (ECDHE+AESGCM, CHACHA20). Valide con un escaneo externo (testssl.sh) que ningún endpoint del entorno de tarjeta negocie protocolos legados y monitoree clientes que fallen el handshake antes del corte.','ok','acknowledged','scan_1783029876975','2026-07-02 18:04:36.983'),
	 ('b1065af2-67da-4334-b378-571dc4bbe024'::uuid,'Política de contraseñas bajo el mínimo exigido','medium','8.2.3','code','SENTINEL-PWD-002','src/auth/password-policy.ts',15,'export const passwordPolicy = {
  minLength: 6,
  requireUppercase: false,
  requireNumber: true,
  requireSymbol: false,
  maxAgeDays: 365,
};','La política acepta contraseñas de 6 caracteres sin mayúsculas ni símbolos. El requisito 8.2.3 (v3.2.1) exige un mínimo de 7 caracteres alfanuméricos, y PCI-DSS v4.0 (8.3.6) eleva el mínimo a 12 caracteres. Las credenciales débiles son el vector más frecuente de compromiso de cuentas con acceso al entorno de datos.','Aumente minLength a 12, exija combinación de mayúsculas, números y símbolos, y reduzca maxAgeDays a 90 para cuentas con acceso al CDE. Aplique la política nueva en el próximo cambio de contraseña de cada usuario y verifique contra listas de contraseñas comprometidas (haveibeenpwned u otra fuente k-anonymity).','ok','open','scan_1783029876975','2026-07-02 18:04:36.984'),
	 ('fd65ca67-b392-48e9-9413-523af0f96982'::uuid,'Cookie de sesión sin flags Secure y HttpOnly','medium','6.5.10','code','SENTINEL-SES-001','src/middleware/session.ts',31,'app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  cookie: { secure: false, httpOnly: false, maxAge: 86400000 },
}));','La cookie de sesión viaja sin el flag Secure (transmisible por HTTP plano) y sin HttpOnly (accesible desde JavaScript). El requisito 6.5.10 cubre la gestión defectuosa de autenticación y sesiones; en un entorno con XSS o red no confiable el token de sesión queda expuesto a robo.','Configure cookie: { secure: true, httpOnly: true, sameSite: ''lax'' } y sirva la aplicación exclusivamente por HTTPS. Reduzca maxAge a la ventana mínima operativa (15 minutos de inactividad según 8.2.8) y regenere el identificador de sesión tras cada autenticación.','ok','open','scan_1783029876975','2026-07-02 18:04:36.985');
INSERT INTO public.findings (id,title,severity,pci_requirement,"source",rule_id,file_path,line_number,snippet,explanation,remediation,reasoning_status,status,scan_id,created_at) VALUES
	 ('3ef9b1f8-b9e4-4e2a-ad83-429110cbca5b'::uuid,'Dependencia con vulnerabilidad crítica conocida (lodash 4.17.15)','medium','6.3.3','code','SENTINEL-DEP-005','package.json',24,'  "dependencies": {
    "express": "^4.18.2",
    "lodash": "4.17.15",
    "pg": "^8.11.0",
    "winston": "^3.10.0"
  },','lodash 4.17.15 tiene vulnerabilidades publicadas de prototype pollution (CVE-2020-8203) y command injection (CVE-2021-23337). El requisito 6.3.3 exige instalar parches de seguridad dentro del mes posterior a su publicación para componentes críticos; la versión fijada impide recibir el parche.','Actualice a lodash ^4.17.21 (o elimine la dependencia si solo usa utilidades reemplazables por JS nativo). Incorpore npm audit o Dependabot al pipeline CI con umbral de falla en severidad alta, para que las dependencias vulnerables bloqueen el merge en lugar de llegar a producción.','ok','open','scan_1783029876975','2026-07-02 18:04:36.986'),
	 ('d4b1385b-73cf-496b-bfa3-145b6e05604f'::uuid,'Timeout de sesión de 24 horas en consola administrativa','medium','8.2.8','code','SENTINEL-SES-003','src/admin/config.ts',9,'export const adminConfig = {
  sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24h
  allowRememberMe: true,
  mfaRequired: false,
};','La sesión administrativa permanece válida 24 horas sin actividad. El requisito 8.2.8 exige re-autenticación tras un máximo de 15 minutos de inactividad para sesiones con acceso a componentes del entorno de datos; una consola admin abierta y desatendida es acceso directo no supervisado.','Reduzca sessionTimeoutMs a 15 minutos de inactividad con renovación por actividad legítima, deshabilite allowRememberMe para roles administrativos y active mfaRequired: true (el requisito 8.4.1 exige MFA para todo acceso administrativo al CDE).','ok','open','scan_1783029876975','2026-07-02 18:04:36.987'),
	 ('c4036f35-cb54-49ba-9614-544d9227c3cb'::uuid,'Versión del servidor expuesta en headers HTTP','low','2.2.5','log','SENTINEL-HDR-001','logs/edge-proxy.log',1187,'2026-07-01T12:03:44Z GET /api/health 200
< Server: nginx/1.18.0 (Ubuntu)
< X-Powered-By: Express
2026-07-01T12:03:45Z GET /api/version 200','Las respuestas HTTP exponen versión exacta de nginx y el framework de aplicación. El requisito 2.2.5 pide eliminar funcionalidad innecesaria e información que facilite el reconocimiento; conocer la versión permite a un atacante buscar exploits específicos sin esfuerzo de fingerprinting.','Configure server_tokens off en nginx y app.disable(''x-powered-by'') en Express. Verifique con curl -I sobre todos los endpoints públicos que ningún header revele versiones de software y agregue esta comprobación al smoke test post-despliegue.','ok','open','scan_1783029876975','2026-07-02 18:04:36.987'),
	 ('80d12bd0-c87c-430a-bebd-b52718bca982'::uuid,'Logs de auditoría sin sincronización horaria (NTP)','low','10.6.1','code','SENTINEL-LOG-006','docker-compose.yml',41,'  audit-worker:
    image: ionix/audit-worker:latest
    environment:
      - TZ=America/Santiago
    # sin volumen /etc/ntp.conf ni servicio de sincronización','El contenedor de auditoría no sincroniza su reloj contra una fuente NTP confiable. El requisito 10.6.1 exige tecnología de sincronización horaria para correlacionar eventos entre sistemas; sin ella, los timestamps de auditoría no son confiables como evidencia forense ni para reconstruir incidentes.','Configure el host Docker con chrony apuntando a servidores NTP internos autenticados y monte el reloj del host en los contenedores (los contenedores heredan el reloj del kernel del host). Documente la fuente de tiempo en el inventario PCI y alerte si la deriva supera 1 segundo.','ok','resolved','scan_1783029876975','2026-07-02 18:04:36.988'),
	 ('ca0ed2de-2b15-4a6d-8c52-ad14077b9a8a'::uuid,'Stack traces detallados devueltos al cliente en errores 500','low','6.5.5','code','SENTINEL-DBG-002','src/middleware/error-handler.ts',18,'export function errorHandler(err, req, res, next) {
  res.status(500).json({
    message: err.message,
    stack: err.stack,
    query: req.query,
  });
}','El manejador de errores serializa el stack trace completo y los parámetros de la request hacia el cliente. El requisito 6.5.5 cubre el manejo inapropiado de errores: los stack traces revelan rutas internas, versiones de librerías y estructura del código, información útil para dirigir un ataque.','Devuelva al cliente un mensaje genérico con un identificador de correlación (res.status(500).json({ error: ''internal_error'', traceId })) y registre el detalle completo solo en el log del servidor. Asegure que NODE_ENV=production desactive cualquier modo verbose de error en frameworks y ORMs.','ok','false_positive','scan_1783029876975','2026-07-02 18:04:36.989'),
	 ('21bccc34-9b78-40c8-9a76-dd249843fc8f'::uuid,'Clave de cifrado hardcodeada en el código fuente','critical','3.5.1','code','SENTINEL-KEY-003','src/services/payment.ts',47,'import crypto from "crypto";

const IV_LENGTH = 16;
const ENCRYPTION_KEY = "s3nt1n3l-2024-prod-key-do-not-share";

export function encryptCard(pan: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);','La clave de cifrado de datos de tarjeta está embebida como literal en el código y versionada en el repositorio. El requisito 3.5.1 exige proteger las claves criptográficas contra divulgación y uso indebido; una clave en el código es accesible para cualquier persona con acceso al repositorio y no puede rotarse sin un despliegue.','Mueva la clave a un gestor de secretos (AWS KMS, Vault o variables de entorno inyectadas en despliegue) y elimínela del historial de git con una reescritura del repositorio. Rote la clave comprometida de inmediato, re-cifre los datos existentes con la clave nueva y documente el procedimiento de rotación periódica.','ok','acknowledged','scan_1783029876975','2026-07-02 18:04:36.981');
