import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../../lib/db";
import { issueSessionToken } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, password } = req.body;

  try {
    const result = await query(
      "SELECT * FROM users WHERE email = $1 AND password = $2",
      [email, password]
    );
    if (result.rows.length === 0) {
      // VULN-015a [PCI-DSS 6.2.4] (CORREGIDO) — se mantiene un log de auditoría
      // del intento fallido (útil para detección de fuerza bruta) pero sin
      // exponer nada al cliente más allá de un mensaje genérico.
      console.warn(`Intento de login fallido para email=${email}`);
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const token = issueSessionToken(result.rows[0].id);
    res.status(200).json({ token });
  } catch (err: any) {
    // VULN-012 [PCI-DSS 6.2.4] / VULN-015b (CORREGIDOS) — el detalle de la
    // excepción (mensaje y stack) se loguea solo en el servidor; al cliente
    // se le devuelve un mensaje genérico sin stack trace.
    console.error("Error de login:", err.message, err.stack);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
