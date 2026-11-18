import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSignedInStaff } from "@/lib/api/staffAuth";
import type { StaffMember } from "@/types/staff";
import { IDLE_LIMIT_MS } from "./constants";
import { checkSession, SESSION_COOKIE } from "./session";
import { cookieSecret } from "./signing";

// The one place access is checked. Roles and permissions will be added here later.

export type StaffSession =
  | { status: "active"; staff: StaffMember; token: string; expiresAt: number }
  | { status: "expired" }
  | { status: "none" }
  /** The backend couldn't be reached, so nobody can be confirmed. Not the same as signed out. */
  | { status: "unavailable" };

export const BACKEND_UNAVAILABLE = "The dashboard can't reach the server right now.";

/**
 * The session, confirmed with the backend, which may have ended it (after logging out elsewhere, say).
 * Confirming counts as activity, restarting the backend's hour. Checked once per request.
 */
export const readStaffSession = cache(async (): Promise<StaffSession> => {
  const local = checkSession((await cookies()).get(SESSION_COOKIE)?.value, cookieSecret());
  if (local.status !== "active") return local;

  const confirmed = await getSignedInStaff(local.token);
  if (confirmed.ok) return { status: "active", staff: confirmed.data, token: local.token, expiresAt: Date.now() + IDLE_LIMIT_MS };
  if (confirmed.error.code === "UNAUTHENTICATED") return { status: "expired" };
  return { status: "unavailable" };
});

/** For every page and action: the signed-in staff member, or a redirect to log in. */
export async function requireStaff(): Promise<{ staff: StaffMember; token: string; expiresAt: number }> {
  const session = await readStaffSession();
  if (session.status === "active") return { staff: session.staff, token: session.token, expiresAt: session.expiresAt };
  // Shown by the error page with a way to try again, rather than logging the person out.
  if (session.status === "unavailable") throw new Error(BACKEND_UNAVAILABLE);
  redirect(session.status === "expired" ? "/login?reason=expired" : "/login");
}
