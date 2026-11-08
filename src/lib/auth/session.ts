import type { StaffMember } from "@/types/staff";
import { IDLE_LIMIT_MS } from "./constants";
import { signJson, verifyJson } from "./signing";

// A staff session ends after 1 hour without activity. Each request through the proxy
// restarts the hour. When the real backend is connected, it owns the session instead.
//
// The session is a signed cookie, so logging out can't cancel a copy already on its way back
// in a response that was loading at the time. Logging out therefore leaves a signed "logged out
// at" cookie, and any session that started before it is refused.

export const SESSION_COOKIE = "ifng_staff";
export const LOGGED_OUT_COOKIE = "ifng_staff_out";

type SessionPayload = { staff: StaffMember; lastActive: number; startedAt: number };

export type SessionCheck =
  | { status: "active"; staff: StaffMember; expiresAt: number; startedAt: number }
  | { status: "expired" }
  | { status: "none" };

/** A new session starts now. Refreshing one keeps when it started. */
export function encodeSession(staff: StaffMember, secret: string, now = Date.now(), startedAt = now): string {
  return signJson({ staff, lastActive: now, startedAt } satisfies SessionPayload, secret);
}

export const encodeLoggedOut = (secret: string, now = Date.now()) => signJson({ at: now }, secret);

/** When this browser last logged out, or null. */
export function loggedOutAt(value: string | undefined, secret: string): number | null {
  const payload = value ? verifyJson<{ at: number }>(value, secret) : null;
  return typeof payload?.at === "number" ? payload.at : null;
}

export function checkSession(value: string | undefined, secret: string, now = Date.now(), loggedOut: number | null = null): SessionCheck {
  if (!value) return { status: "none" };
  const payload = verifyJson<SessionPayload>(value, secret);
  if (!payload?.staff || typeof payload.lastActive !== "number") return { status: "none" };
  const startedAt = typeof payload.startedAt === "number" ? payload.startedAt : 0;
  if (loggedOut !== null && startedAt <= loggedOut) return { status: "none" };

  const expiresAt = payload.lastActive + IDLE_LIMIT_MS;
  if (expiresAt <= now) return { status: "expired" };
  return { status: "active", staff: payload.staff, expiresAt, startedAt };
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  // The browser may keep it a day, but it only works within an hour of the last activity.
  maxAge: 24 * 60 * 60,
};
