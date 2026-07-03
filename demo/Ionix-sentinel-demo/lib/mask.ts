// Trampa T2 (control negativo) — implementación CORRECTA de enmascaramiento
// de PAN según PCI-DSS 3.4.1 (máximo BIN/primeros 6 + últimos 4 visibles).
// Se usa en un solo lugar del repo (components/AdminReconciliation.tsx tiene
// la variante SIN enmascarar, VULN-010, para comparar). Esta función en sí
// no debería generar un hallazgo.
export function maskPan(pan: string): string {
  const digits = pan.replace(/\D/g, "");
  if (digits.length < 10) return "****";
  const first6 = digits.slice(0, 6);
  const last4 = digits.slice(-4);
  return `${first6}${"*".repeat(digits.length - 10)}${last4}`;
}
