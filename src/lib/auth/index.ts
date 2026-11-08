import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { StaffMember } from "@/types/staff";
import { checkSession, LOGGED_OUT_COOKIE, loggedOutAt, SESSION_COOKIE, type SessionCheck } from "./session";
import { cookieSecret } from "./signing";

// The one place access is checked. Roles and permissions will be added here later.

export async function readStaffSession(): Promise<SessionCheck> {
  const jar = await cookies();
  const secret = cookieSecret();
  return checkSession(jar.get(SESSION_COOKIE)?.value, secret, Date.now(), loggedOutAt(jar.get(LOGGED_OUT_COOKIE)?.value, secret));
}

/** For every page and action: the signed-in staff member, or a redirect to log in. */
export async function requireStaff(): Promise<{ staff: StaffMember; expiresAt: number }> {
  const session = await readStaffSession();
  if (session.status === "active") return { staff: session.staff, expiresAt: session.expiresAt };
  redirect(session.status === "expired" ? "/login?reason=expired" : "/login");
}
