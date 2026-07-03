import { Category, Severity, Source } from "../types/finding";

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de hallazgos semilla para la demo del selector "Repositorio".
//
// Cada rama del dropdown resuelve a un subconjunto de estos hallazgos. El código
// fuente que los respalda vive en /demo/{variante} (material de referencia); acá
// solo está lo que se INSERTA en Postgres y la manifestación en logs que alimenta
// el Dashboard de logs. NO se insertan los controles negativos (TRAP-T1/T2/T3).
//
// Fuente de verdad de las 7: demo/Ionix-sentinel-demo/findings-expected.json.
// ─────────────────────────────────────────────────────────────────────────────

export type BranchKey = "main" | "develop" | "demo-7" | "demo-3" | "demo-0";

export const BRANCH_KEYS: BranchKey[] = ["main", "develop", "demo-7", "demo-3", "demo-0"];

export const BRANCH_LABEL: Record<BranchKey, string> = {
  main: "main",
  develop: "develop",
  "demo-7": "demo/7-vulnerabilidades",
  "demo-3": "demo/3-vulnerabilidades",
  "demo-0": "demo/0-vulnerabilidades",
};

export interface SeedFinding {
  ruleId: string; // = id del ground truth (ej. "VULN-002"), estable entre corridas
  category: Category;
  pciRequirement: string;
  title: string;
  severity: Severity;
  source: Source; // "code" para las 7 (análisis estático)
  filePath: string;
  lineNumber: number;
  snippet: string;
  explanation: string;
  remediation: string;
  // Manifestación en el log de producción (Dashboard de logs).
  log: {
    service: string;
    role: string;
    route: string;
    level: "info" | "warn" | "error";
    message: string;
    errorCode: string;
    sourceIp?: string;
  };
}

const VULN_002: SeedFinding = {
  ruleId: "VULN-002",
  category: "pci_compliance",
  pciRequirement: "3.5.1",
  title: "PAN almacenado en texto plano en la base de datos",
  severity: "critical",
  source: "code",
  filePath: "migrations/001_init.sql",
  lineNumber: 8,
  snippet: `    pan VARCHAR(19) NOT NULL,          -- VULN-002: PAN en claro, sin truncar/tokenizar
    expiry_date VARCHAR(5) NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);`,
  explanation:
    "La columna cardholders.pan persiste el número de tarjeta completo en un VARCHAR sin cifrar ni tokenizar. El requisito 3.5.1 de PCI-DSS exige que el PAN sea ilegible en cualquier lugar donde se almacene. Cualquier acceso a esta tabla —incluido un respaldo o un dump de desarrollo— expone datos de tarjeta en claro.",
  remediation:
    "Tokenice el PAN mediante el proveedor de pagos o cífrelo con AES-256-GCM usando una clave gestionada en un KMS. Si solo necesita los últimos 4 dígitos para mostrar, almacene únicamente el PAN truncado y elimine la columna en claro con una migración que sobrescriba los datos existentes.",
  log: {
    service: "postgres",
    role: "Base de datos",
    route: "schema.audit",
    level: "warn",
    message: "schema audit: columna cardholders.pan almacena el PAN en texto plano (VARCHAR)",
    errorCode: "PCI-3.5.1",
  },
};

const VULN_006: SeedFinding = {
  ruleId: "VULN-006",
  category: "pci_compliance",
  pciRequirement: "7.2.1",
  title: "Endpoint sin autenticación ni autorización que expone el PAN completo",
  severity: "critical",
  source: "code",
  filePath: "pages/api/payments/[id].ts",
  lineNumber: 8,
  snippet: `export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  const result = await query("SELECT * FROM cardholders WHERE id = $1", [id]);
  const cardholder = result.rows[0];

  // Sin chequeo de sesión/rol antes de devolver los datos completos.
  res.status(200).json(cardholder);
}`,
  explanation:
    "GET /api/payments/:id devuelve el registro completo del cardholder (incluido el PAN) sin verificar sesión ni rol. Cualquiera que conozca o adivine un id puede leer datos de tarjeta de otro cliente. El requisito 7.2.1 exige control de acceso basado en necesidad de negocio para todo componente del entorno de datos de tarjeta.",
  remediation:
    "Agregue verificación de sesión y autorización por rol antes de responder, y devuelva el PAN enmascarado (BIN + últimos 4) salvo que exista una necesidad de negocio documentada. Registre cada acceso a datos de tarjeta con la identidad del actor.",
  log: {
    service: "payment-service",
    role: "Procesamiento de pagos",
    route: "GET /api/payments/:id",
    level: "error",
    message: "cardholder servido sin verificación de auth/rol — PAN expuesto en la respuesta",
    errorCode: "PCI-7.2.1",
    sourceIp: "203.0.113.44",
  },
};

const VULN_004: SeedFinding = {
  ruleId: "VULN-004",
  category: "codigo",
  pciRequirement: "3.6.1",
  title: "Clave de cifrado hardcodeada y modo AES-128-ECB (débil) para proteger el PAN",
  severity: "high",
  source: "code",
  filePath: "lib/crypto.ts",
  lineNumber: 7,
  snippet: `const HARDCODED_KEY = "s3cr3tKey123456"; // 16 bytes, hardcodeada

export function weakEncryptPan(pan: string): string {
  const cipher = crypto.createCipheriv(
    "aes-128-ecb",
    Buffer.from(HARDCODED_KEY),
    null // ECB no usa IV
  );
  return cipher.update(pan, "utf8", "hex") + cipher.final("hex");
}`,
  explanation:
    "weakEncryptPan usa una clave literal en el código y el modo ECB, que no usa IV, es determinístico y filtra patrones del texto plano — no califica como cifrado fuerte para proteger PAN (requisito 3.6.1). Una clave en el código no puede rotarse sin un despliegue y queda expuesta a cualquiera con acceso al repositorio.",
  remediation:
    "Use la función encryptPanStrong ya presente en el mismo archivo (AES-256-GCM con clave desde variable de entorno e IV aleatorio) y mueva la clave a un KMS/HSM. Rote la clave comprometida y re-cifre los datos existentes.",
  log: {
    service: "payment-service",
    role: "Procesamiento de pagos",
    route: "pan.encrypt",
    level: "warn",
    message: "pan.encrypt usando aes-128-ecb con clave hardcodeada (cifrado débil)",
    errorCode: "PCI-3.6.1",
  },
};

const VULN_003B: SeedFinding = {
  ruleId: "VULN-003b",
  category: "codigo",
  pciRequirement: "6.2.4",
  title: "Inyección SQL por concatenación de strings con datos de usuario",
  severity: "high",
  source: "code",
  filePath: "pages/api/payments/charge.ts",
  lineNumber: 14,
  snippet: `  const insertSql = \`INSERT INTO cardholders (customer_email, pan, expiry_date)
    VALUES ('\${customerEmail}', '\${pan}', '\${expiry}') RETURNING id\`;

  const result = await query(insertSql);`,
  explanation:
    "El insert concatena customerEmail, pan y expiry directamente en el string SQL en vez de usar parámetros preparados (la función query() sí los soporta). El requisito 6.2.4 exige proteger contra fallas de inyección; un atacante puede manipular esos campos para leer o alterar la tabla completa de cardholders.",
  remediation:
    "Reescriba la consulta con parámetros preparados: query('INSERT INTO cardholders (customer_email, pan, expiry_date) VALUES ($1,$2,$3) RETURNING id', [customerEmail, pan, expiry]). Agregue validación de tipos en el borde de la API y una regla de lint que prohíba concatenar strings en llamadas SQL.",
  log: {
    service: "payment-service",
    role: "Procesamiento de pagos",
    route: "POST /api/payments/charge",
    level: "error",
    message: "SQL no parametrizado ejecutado con input de usuario (posible inyección) en charge.ts",
    errorCode: "PCI-6.2.4",
    sourceIp: "203.0.113.9",
  },
};

const VULN_009: SeedFinding = {
  ruleId: "VULN-009",
  category: "codigo",
  pciRequirement: "8.6.2",
  title: "API key de proveedor de pagos (Stripe) hardcodeada en el código fuente",
  severity: "high",
  source: "code",
  filePath: "pages/api/webhooks/stripe.ts",
  lineNumber: 7,
  snippet: `const STRIPE_SECRET_KEY = "sk_live_FAKE_DEMO_KEY_NOT_REAL_0000000000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  void STRIPE_SECRET_KEY;
  res.status(200).json({ received: true });
}`,
  explanation:
    "La clave secreta de Stripe está embebida como literal en el código y versionada en el repositorio. Si el repo se filtra o queda en un fork público, la key queda comprometida y permite operar contra la cuenta real. El requisito 8.6.2 exige que las credenciales de aplicaciones y servicios se gestionen de forma segura, no como texto en el código.",
  remediation:
    "Cargue la key desde process.env.STRIPE_SECRET_KEY (ya declarada en .env.example) o desde un secret manager, elimínela del historial de git y rótela de inmediato en el panel del proveedor.",
  log: {
    service: "webhook-service",
    role: "Webhooks de proveedores de pago",
    route: "POST /api/webhooks/stripe",
    level: "warn",
    message: "cliente Stripe inicializado con API key hardcodeada en el código",
    errorCode: "PCI-8.6.2",
  },
};

const VULN_011: SeedFinding = {
  ruleId: "VULN-011",
  category: "pci_compliance",
  pciRequirement: "4.2.1",
  title: "Conexión a la base de datos sin TLS (ssl: false) para tráfico que incluye PAN",
  severity: "medium",
  source: "code",
  filePath: "lib/db.ts",
  lineNumber: 10,
  snippet: `  ssl: false, // VULN-011: sin TLS para tráfico que incluye PAN
});`,
  explanation:
    "El pool de Postgres se crea con ssl: false explícito, así que el tráfico entre la aplicación y la base de datos —que transporta el PAN— viaja sin cifrar. El requisito 4.2.1 exige criptografía fuerte para cualquier transmisión de datos de tarjeta, incluido el tráfico interno entre servicios.",
  remediation:
    "Habilite TLS en la conexión (ssl: { rejectUnauthorized: true, ca: <CA interna> }) o fuerce sslmode=require en la connection string, y verifique el certificado del servidor de base de datos.",
  log: {
    service: "payment-service",
    role: "Procesamiento de pagos",
    route: "db.connect",
    level: "warn",
    message: "pool de Postgres conectado con ssl=false (tráfico con PAN sin TLS)",
    errorCode: "PCI-4.2.1",
  },
};

const VULN_LIB_001: SeedFinding = {
  ruleId: "VULN-LIB-001",
  category: "libreria",
  pciRequirement: "6.3.3",
  title: "Dependencia con vulnerabilidad crítica conocida (lodash 4.17.15 — CVE-2020-8203)",
  severity: "medium",
  source: "code",
  filePath: "package.json",
  lineNumber: 17,
  snippet: `    "lodash": "4.17.15"
  },`,
  explanation:
    "lodash 4.17.15 tiene vulnerabilidades públicas de prototype pollution (CVE-2020-8203) y command injection (CVE-2021-23337), ambas parchadas en versiones posteriores. El requisito 6.3.3 exige instalar parches de seguridad dentro del mes de su publicación; fijar una versión vieja deja el componente expuesto a exploits conocidos.",
  remediation:
    "Actualice a lodash >=4.17.21 (o elimine la dependencia si sus usos son reemplazables por JS nativo). Incorpore npm audit o Dependabot al pipeline CI con umbral de falla en severidad alta.",
  log: {
    service: "build",
    role: "Pipeline de build / dependencias",
    route: "dependency.audit",
    level: "warn",
    message: "dependency audit: lodash@4.17.15 con CVE-2020-8203 (prototype pollution)",
    errorCode: "PCI-6.3.3",
  },
};

const ALL_7: SeedFinding[] = [VULN_002, VULN_006, VULN_004, VULN_003B, VULN_009, VULN_011, VULN_LIB_001];

// Subconjunto de 3: una por categoría (pci_compliance / codigo / libreria) y
// una por nivel de severidad (crítica / alta / media).
const DEMO_3: SeedFinding[] = [VULN_002, VULN_003B, VULN_LIB_001];

export const BRANCH_FINDINGS: Record<BranchKey, SeedFinding[]> = {
  main: [],
  develop: [],
  "demo-7": ALL_7,
  "demo-3": DEMO_3,
  "demo-0": [],
};

export function isBranchKey(value: unknown): value is BranchKey {
  return typeof value === "string" && (BRANCH_KEYS as string[]).includes(value);
}
