import type { NextApiRequest, NextApiResponse } from "next";

// VULN-009 [PCI-DSS 8.6.2] (CORREGIDO en demo-3) — la API key se lee desde
// process.env.STRIPE_SECRET_KEY (ver .env.example), ya no está hardcodeada.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Stripe no configurado" });
  }
  res.status(200).json({ received: true });
}
