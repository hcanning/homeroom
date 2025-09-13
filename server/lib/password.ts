import { randomBytes, scryptSync } from "crypto";

// format: scrypt$N$r$p$saltBase64$dkBase64
export function hashPassword(password: string): string {
  const N = 16384,
    r = 8,
    p = 1;
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 32, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, nStr, rStr, pStr, saltB64, dkB64] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const N = parseInt(nStr, 10),
      r = parseInt(rStr, 10),
      p = parseInt(pStr, 10);
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(dkB64, "base64");
    const key = scryptSync(password, salt, expected.length, { N, r, p });
    if (key.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < key.length; i++) diff |= key[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}
