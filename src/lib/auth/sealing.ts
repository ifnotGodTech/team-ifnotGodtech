import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Encrypted, tamper-evident cookie values (AES-256-GCM), for cookies that hold a secret such as the
// backend's token. The browser stores them but can't read or change them.

const IV_BYTES = 12;
const TAG_BYTES = 16;

const keyFrom = (secret: string) => createHash("sha256").update(`ifng-dashboard-seal:${secret}`).digest();

export function sealJson(data: unknown, secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

/** The sealed data, or null if the value was changed, sealed with another secret, or is malformed. */
export function openJson<T>(value: string, secret: string): T | null {
  const bytes = Buffer.from(value, "base64url");
  if (bytes.length <= IV_BYTES + TAG_BYTES) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", keyFrom(secret), bytes.subarray(0, IV_BYTES));
    decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    const decrypted = Buffer.concat([decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    return null;
  }
}
