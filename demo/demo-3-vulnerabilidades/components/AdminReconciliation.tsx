import { useEffect, useState } from "react";
import { maskPan } from "../lib/mask";

// VULN-010 [PCI-DSS 3.4.1] (CORREGIDO) — el fixture original renderizaba el
// PAN completo sin enmascarar. Ahora usa lib/mask.ts::maskPan (primeros 6 +
// últimos 4) antes de mostrarlo en pantalla. El endpoint que consulta
// (/api/payments/[id]) sigue sin control de acceso a propósito — ver VULN-006.
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
            <td>{maskPan(row.pan)}</td>
            <td>{row.expiry_date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
