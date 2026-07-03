import crypto from "crypto";

// VULN-004 [PCI-DSS 3.6.1 / 3.5.1] — Clave de cifrado hardcodeada en el código
// fuente (debería vivir en un KMS/HSM o al menos en una env var protegida) y
// algoritmo AES-128-ECB: ECB no usa IV, es determinístico y filtra patrones del
// texto plano — no es "cifrado fuerte" aceptable para PAN.
const HARDCODED_KEY = "s3cr3tKey123456"; // 16 bytes, hardcodeada

export function weakEncryptPan(pan: string): string {
  const cipher = crypto.createCipheriv(
    "aes-128-ecb",
    Buffer.from(HARDCODED_KEY),
    null // ECB no usa IV
  );
  return cipher.update(pan, "utf8", "hex") + cipher.final("hex");
}

// ---- Ejemplo correcto (control negativo / trampa T3) ----------------------
// Implementación que SÍ cumple: AES-256-GCM, clave desde variable de entorno,
// IV aleatorio por operación. El analizador NO debería marcar esta función
// como hallazgo — se incluye para medir falsos positivos.
export function encryptPanStrong(pan: string): { ciphertext: string; iv: string; tag: string } {
  const key = Buffer.from(process.env.PAN_ENCRYPTION_KEY ?? "", "hex"); // 32 bytes desde env
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = cipher.update(pan, "utf8", "hex") + cipher.final("hex");
  return { ciphertext, iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex") };
}
