import { Pool } from "pg";

// VULN-001 [PCI-DSS 8.6.2] (CORREGIDO) — las credenciales se leen desde
// DATABASE_URL (ver .env.example), no quedan hardcodeadas en el código.
// VULN-011 [PCI-DSS 4.2.1] (CORREGIDO en demo-3) — la conexión ahora exige TLS
// verificando el certificado del servidor de base de datos.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }, // VULN-011: TLS obligatorio para tráfico con PAN
});

// VULN-013 [PCI-DSS 8.6.2] (CORREGIDO) — antes se logueaba la connection
// string completa (con password) ante un error del pool; ahora se loguea un
// mensaje genérico sin credenciales.
pool.on("error", (err) => {
  console.error("Error en el pool de conexiones de Postgres", err.message);
});

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}
