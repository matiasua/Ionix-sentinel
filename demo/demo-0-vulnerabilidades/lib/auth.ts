import jwt from "jsonwebtoken";

// VULN-005 [PCI-DSS 8.6.2] (CORREGIDO) — el secreto de firma ahora se lee
// desde JWT_SECRET (ver .env.example) y los tokens expiran a las 15 minutos.
const JWT_SECRET = process.env.JWT_SECRET ?? "";

export function issueSessionToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
}

export function verifySessionToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    // VULN-014 [PCI-DSS 8.6.2] (CORREGIDO) — ya no se imprime el secreto en
    // el log de un intento de verificación fallido.
    console.error("Fallo al verificar token de sesión", (err as Error).message);
    throw err;
  }
}
