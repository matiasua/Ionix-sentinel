import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../../lib/db";

// VULN-006 [PCI-DSS 7.2.1] — se mantiene a propósito: endpoint de
// conciliación/consulta de cardholder sin ninguna verificación de
// autenticación ni autorización. Cualquiera que conozca o adivine el id
// puede leer el PAN completo del registro.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  const result = await query("SELECT * FROM cardholders WHERE id = $1", [id]);
  const cardholder = result.rows[0];

  // VULN-017 [PCI-DSS 3.3.2] (CORREGIDO) — ya no se loguea el registro
  // completo (incluía PAN) en cada consulta.

  // No hay chequeo de sesión/rol antes de devolver los datos completos
  // (esa es la vulnerabilidad que se mantiene, VULN-006).
  res.status(200).json(cardholder);
}
