import crypto from "crypto";

// VULN-004 [PCI-DSS 3.6.1] (CORREGIDO en demo-3) — se eliminó la clave
// hardcodeada y el modo AES-128-ECB. El cifrado de PAN pasa por encryptPanStrong
// (AES-256-GCM con clave desde env var e IV aleatorio). Se mantiene una función
// con el nombre histórico como alias delgado para no romper llamadores.
export function weakEncryptPan(pan: string): string {
  return encryptPanStrong(pan).ciphertext;
}

// ---- Cifrado fuerte (también es el control negativo / trampa T3) ----------
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
