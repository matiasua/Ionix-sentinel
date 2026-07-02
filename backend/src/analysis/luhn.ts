// T1.4 (HU-B1.3) — Validación de Luhn.
//
// Gotcha conocido del proyecto (CLAUDE.md): un regex de "posible número de
// tarjeta" sin validar Luhn genera falsos positivos masivos. Esta función se
// usa en analysis/runner.ts para descartar matches numéricos que no son PAN
// reales antes de que lleguen a convertirse en un finding.
export function isValidLuhn(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, "");
  if (digits.length < 12) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}
