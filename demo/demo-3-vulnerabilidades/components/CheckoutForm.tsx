import { useState } from "react";

export default function CheckoutForm() {
  const [pan, setPan] = useState("");
  const [cvv, setCvv] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // VULN-008a/008b [PCI-DSS 3.3 / 3.4.1] (CORREGIDOS) — el fixture original
    // guardaba PAN/CVV en localStorage y los imprimía en consola. Ninguno de
    // los dos datos se persiste ni se loguea en el cliente ahora; solo viajan
    // en el body del POST hacia el backend.
    await fetch("/api/payments/charge", {
      method: "POST",
      body: JSON.stringify({ pan, cvv }),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={pan} onChange={(e) => setPan(e.target.value)} placeholder="Número de tarjeta" />
      <input value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="CVV" />
      <button type="submit">Pagar</button>
    </form>
  );
}
