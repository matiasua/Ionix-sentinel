import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // cvv se recibe para autorizar contra el gateway pero (correctamente) nunca
  // se loguea ni se persiste — ver VULN-003a/003c/003d corregidos abajo.
  const { pan, cvv, expiry, amount, customerEmail } = req.body;
  void cvv;

  // VULN-003b [PCI-DSS 6.2.4] — se mantiene a propósito: inyección SQL. El
  // PAN y otros campos vienen directo del body y se concatenan en el query
  // en vez de usar parámetros preparados (la función `query` sí soporta
  // params, pero aquí no se usan).
  const insertSql = `INSERT INTO cardholders (customer_email, pan, expiry_date)
    VALUES ('${customerEmail}', '${pan}', '${expiry}') RETURNING id`;

  const result = await query(insertSql);
  const cardholderId = result.rows[0].id;

  // VULN-003a/003c/003d (CORREGIDOS) — ya no se loguea PAN/CVV, ya no se
  // persiste track2 (la columna ni siquiera existe, ver migrations/001_init.sql)
  // y la respuesta del gateway que se guarda no incluye datos de tarjeta.
  await query(
    "INSERT INTO transactions (cardholder_id, amount, status, raw_gateway_response) VALUES ($1, $2, $3, $4)",
    [cardholderId, amount, "approved", JSON.stringify({ provider: "demo-gateway" })]
  );

  res.status(200).json({ ok: true, cardholderId });
}
