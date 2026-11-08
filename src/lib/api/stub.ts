import type { LoginChallenge, StaffMember } from "@/types/staff";
import type { DashboardBackend } from "./backend";
import { apiError, type ApiResult } from "./errors";
import { cookieSecret, signJson, verifyJson } from "@/lib/auth/signing";

// A stand-in backend until phase 7. Nothing is stored and no email is sent. Any
// @ifnotgod.com email logs in, the code is always 123456, and fixed values show each error:
export const STUB_RULES = {
  staffDomain: "@ifnotgod.com",
  wrongPassword: "wrong-password",
  lockedEmail: "locked@ifnotgod.com",
  code: "123456",
} as const;

export const CODE_LIFETIME_MS = 10 * 60 * 1000;

const ok = <T>(data: T): ApiResult<T> => ({ ok: true, data });

function staffFor(email: string): StaffMember {
  const local = email.split("@")[0].replace(/[._-]+/g, " ");
  const name = local.replace(/\b\w/g, (letter) => letter.toUpperCase());
  return { id: `staff-${Buffer.from(email).toString("base64url")}`, name, email };
}

function challengeFor(email: string, now: number): LoginChallenge {
  const expiresAt = now + CODE_LIFETIME_MS;
  return { challengeId: signJson({ email, expiresAt }, cookieSecret()), sentTo: email, expiresAt: new Date(expiresAt).toISOString() };
}

export function createStubBackend(now = () => Date.now()): DashboardBackend {
  return {
    async logIn(email, password) {
      const normalized = email.trim().toLowerCase();
      if (normalized === STUB_RULES.lockedEmail) return { ok: false, error: apiError("RATE_LIMITED", 429) };
      if (!normalized.endsWith(STUB_RULES.staffDomain) || password === STUB_RULES.wrongPassword) {
        return { ok: false, error: apiError("UNAUTHENTICATED", 401, { message: "That email and password don't match a team account." }) };
      }
      return ok(challengeFor(normalized, now()));
    },

    async verifyCode(challengeId, code) {
      const challenge = verifyJson<{ email: string; expiresAt: number }>(challengeId, cookieSecret());
      if (!challenge || challenge.expiresAt <= now()) {
        return { ok: false, error: apiError("UNAUTHENTICATED", 401, { message: "That code has expired. Send a new one." }) };
      }
      if (code.trim() !== STUB_RULES.code) {
        return { ok: false, error: apiError("VALIDATION", 422, { message: "That code isn't right. Check it, or send a new one." }) };
      }
      return ok(staffFor(challenge.email));
    },

    async resendCode(challengeId) {
      const challenge = verifyJson<{ email: string }>(challengeId, cookieSecret());
      if (!challenge) return { ok: false, error: apiError("UNAUTHENTICATED", 401) };
      return ok(challengeFor(challenge.email, now()));
    },
  };
}
