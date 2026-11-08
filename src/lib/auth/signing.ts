import { createHmac, timingSafeEqual } from "node:crypto";

// Signed, tamper-evident cookie values. Not encrypted: never put secrets in them.

const DEV_SECRET = "local-development-only-dashboard-secret";

export function cookieSecret(): string {
  const secret = process.env.DASHBOARD_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.VERCEL_ENV === "production") throw new Error("DASHBOARD_SESSION_SECRET must be set in production.");
  return DEV_SECRET;
}

const sign = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url");

export function signJson(data: unknown, secret: string): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** The signed data, or null if the value was changed or is malformed. */
export function verifyJson<T>(value: string, secret: string): T | null {
  const [payload, signature, ...rest] = value.split(".");
  if (!payload || !signature || rest.length > 0) return null;

  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
