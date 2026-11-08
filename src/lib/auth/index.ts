import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { StaffMember } from "@/types/staff";
import { checkSession, SESSION_COOKIE, type SessionCheck } from "./session";
import { cookieSecret } from "./signing";

// The one place access is checked. Roles and permissions will be added here later.

export async function readStaffSession(): Promise<SessionCheck> {
  return checkSession((await cookies()).get(SESSION_COOKIE)?.value, cookieSecret());
}

/** For every page and action: the signed-in staff member, or a redirect to log in. */
export async function requireStaff(): Promise<{ staff: StaffMember; expiresAt: number }> {
  const session = await readStaffSession();
  if (session.status === "active") return { staff: session.staff, expiresAt: session.expiresAt };
  redirect(session.status === "expired" ? "/login?reason=expired" : "/login");
}
