import { useEffect, useState } from "react";

// VULN-010 [PCI-DSS 3.4.1] (CORREGIDO) — nunca se dispone del PAN completo en el
// cliente: la base de datos solo guarda pan_last4 (ver migrations/001_init.sql),
// así que la UI muestra directamente los últimos 4 dígitos enmascarados.
export default function AdminReconciliation() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/payments/1")
      .then((r) => r.json())
      .then((data) => setRows([data]));
  }, []);

  return (
    <table>
      <thead>
        <tr><th>Email</th><th>PAN</th><th>Vencimiento</th></tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.customer_email}</td>
            <td>{`•••• •••• •••• ${row.pan_last4 ?? "••••"}`}</td>
            <td>{row.expiry_date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
