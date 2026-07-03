import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../../lib/db";

// Stub del proveedor de pagos: en producción esto llama al gateway (Stripe/Transbank)
// que devuelve un token de red por el PAN. El PAN nunca toca nuestra base de datos.
async function tokenizeWithGateway(_pan: string): Promise<string> {
  return `tok_${Math.random().toString(36).slice(2, 14)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // El PAN/CVV se envían al gateway para tokenizar; nunca se loguean ni se
  // persisten en claro. Solo se guarda el token y los últimos 4 dígitos.
  const { pan, cvv, expiry, amount, customerEmail } = req.body;
  void cvv;
  const panToken = await tokenizeWithGateway(pan);
  const panLast4 = String(pan).slice(-4);

  // VULN-003b [PCI-DSS 6.2.4] (CORREGIDO en demo-0) — consulta parametrizada:
  // los valores viajan como bindings ($1..$4), no concatenados en el SQL.
  const result = await query(
    `INSERT INTO cardholders (customer_email, pan_token, pan_last4, expiry_date)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [customerEmail, panToken, panLast4, expiry]
  );
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
