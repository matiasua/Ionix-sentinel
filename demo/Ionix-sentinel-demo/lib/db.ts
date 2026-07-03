import { Pool } from "pg";

// VULN-001 [PCI-DSS 8.6.2] (CORREGIDO) — las credenciales ahora se leen desde
// DATABASE_URL (ver .env.example), no quedan hardcodeadas en el código.
// VULN-011 [PCI-DSS 4.2.1] — se mantiene a propósito: ssl explícitamente
// deshabilitado, la conexión a la base de datos (que transporta PAN) viaja
// sin cifrado fuerte.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // VULN-011: sin TLS para tráfico que incluye PAN
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
