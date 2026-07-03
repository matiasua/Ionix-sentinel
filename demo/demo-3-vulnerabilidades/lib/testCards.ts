// Trampa T1 (control negativo) — estos "números de tarjeta" tienen 16 dígitos
// pero NO pasan el checksum de Luhn, es decir, no son PAN válidos (son datos
// de prueba/fixtures). Un regex ingenuo los marcaría como PAN; el motor de
// reglas de Sentinel debe validar Luhn antes de reportar, así que esto NO
// debería aparecer como hallazgo real de PAN expuesto.
export const NON_LUHN_TEST_SEQUENCES = [
  "4111111111111112", // falla Luhn a propósito
  "5500000000000005", // falla Luhn a propósito
  "1234567812345678", // falla Luhn a propósito
];
