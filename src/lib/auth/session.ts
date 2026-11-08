import type { StaffMember } from "@/types/staff";
import { signJson, verifyJson } from "./signing";

// A staff session ends after 1 hour without activity. Each request through the proxy
// restarts the hour. When the real backend is connected, it owns the session instead.

export const SESSION_COOKIE = "ifng_staff";
export const IDLE_LIMIT_MS = 60 * 60 * 1000;
/** Shown before the session ends, so unsaved changes aren't lost. */
export const WARNING_BEFORE_MS = 5 * 60 * 1000;

type SessionPayload = { staff: StaffMember; lastActive: number };

export type SessionCheck =
  | { status: "active"; staff: StaffMember; expiresAt: number }
  | { status: "expired" }
  | { status: "none" };

export function encodeSession(staff: StaffMember, secret: string, now = Date.now()): string {
  return signJson({ staff, lastActive: now } satisfies SessionPayload, secret);
}

export function checkSession(value: string | undefined, secret: string, now = Date.now()): SessionCheck {
  if (!value) return { status: "none" };
  const payload = verifyJson<SessionPayload>(value, secret);
  if (!payload?.staff || typeof payload.lastActive !== "number") return { status: "none" };

  const expiresAt = payload.lastActive + IDLE_LIMIT_MS;
  if (expiresAt <= now) return { status: "expired" };
  return { status: "active", staff: payload.staff, expiresAt };
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  // The browser may keep it a day, but it only works within an hour of the last activity.
  maxAge: 24 * 60 * 60,
};
