import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../../lib/db";

// VULN-007 [PCI-DSS 4.2.1] (CORREGIDO) — el fixture original recibía el PAN
// como query param en una petición GET, exponiéndolo en logs de acceso e
// historial del navegador. Ahora es POST y referencia al cardholder por id
// interno en vez de por PAN.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { cardholderId, amount } = req.body;

  // VULN-016 [PCI-DSS 3.4.1] (CORREGIDO) — ya no se loguea el PAN al
  // procesar el reembolso.
  console.log(`Refund solicitado para cardholderId=${cardholderId} monto=${amount}`);

  await query(
    "INSERT INTO transactions (cardholder_id, amount, status) VALUES ($1, $2, 'refunded')",
    [cardholderId, amount]
  );

  res.status(200).json({ ok: true });
}
