import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../../lib/db";
import { verifySessionToken } from "../../../lib/auth";

// VULN-006 [PCI-DSS 7.2.1] (CORREGIDO en demo-3) — el endpoint ahora exige un
// token de sesión válido y rol autorizado antes de responder, y devuelve el PAN
// enmascarado. Solo se atiende la necesidad de negocio con control de acceso.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  let session: any;
  try {
    session = verifySessionToken(token);
  } catch {
    return res.status(401).json({ error: "No autorizado" });
  }
  if (session?.role !== "reconciliation") {
    return res.status(403).json({ error: "Prohibido" });
  }

  const result = await query(
    "SELECT id, customer_email, expiry_date FROM cardholders WHERE id = $1",
    [id]
  );
  res.status(200).json(result.rows[0]);
}
