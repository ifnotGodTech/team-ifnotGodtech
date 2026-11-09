import type { StaffMember } from "@/types/staff";
import { IDLE_LIMIT_MS } from "./constants";
import { openJson, sealJson } from "./sealing";

// The staff session cookie holds the backend's token, encrypted, with who it's for and when they were
// last active. The backend owns the session: it ends the token after an hour without activity, and
// logging out revokes it, so a copy of this cookie stops working everywhere.
//
// This cookie's own hour is a convenience for the proxy and the "session ending" warning. Pages and
// actions confirm the token with the backend through readStaffSession.

export const SESSION_COOKIE = "ifng_staff";

type SessionPayload = { staff: StaffMember; token: string; lastActive: number };

export type SessionCheck =
  | { status: "active"; staff: StaffMember; token: string; expiresAt: number }
  | { status: "expired" }
  | { status: "none" };

export function encodeSession(staff: StaffMember, token: string, secret: string, now = Date.now()): string {
  return sealJson({ staff, token, lastActive: now } satisfies SessionPayload, secret);
}

export function checkSession(value: string | undefined, secret: string, now = Date.now()): SessionCheck {
  if (!value) return { status: "none" };
  const payload = openJson<SessionPayload>(value, secret);
  if (!payload?.staff || typeof payload.token !== "string" || typeof payload.lastActive !== "number") return { status: "none" };

  const expiresAt = payload.lastActive + IDLE_LIMIT_MS;
  if (expiresAt <= now) return { status: "expired" };
  return { status: "active", staff: payload.staff, token: payload.token, expiresAt };
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  // The browser may keep it a day, but it only works within an hour of the last activity.
  maxAge: 24 * 60 * 60,
};
