import { z } from "zod";
import type { LoginChallenge, SignedIn, StaffMember } from "@/types/staff";
import type { ApiResult } from "./errors";
import { apiRequest } from "./http";

// Staff log in, through the backend's /staff/ endpoints. The token never reaches the browser: the
// auth actions keep it inside the encrypted session cookie and pass it back here.

const staffSchema: z.ZodType<StaffMember> = z.object({ id: z.string(), name: z.string(), email: z.string() });
const challengeSchema: z.ZodType<LoginChallenge> = z.object({ challengeId: z.string(), sentTo: z.string(), expiresAt: z.string() });
const signedInSchema: z.ZodType<SignedIn> = z.object({ token: z.string().min(1), staff: staffSchema });
const noContent = z.unknown().transform(() => null);

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/** Checks the password and emails a 6-digit code. */
export function startLogIn(email: string, password: string): Promise<ApiResult<LoginChallenge>> {
  return apiRequest("/staff/log-in/", { method: "POST", body: { email, password }, schema: challengeSchema });
}

/** The right code signs in. Five wrong codes end the log in (detail code TOO_MANY_CODES). */
export function checkCode(challengeId: string, code: string): Promise<ApiResult<SignedIn>> {
  return apiRequest("/staff/log-in/code/", { method: "POST", body: { challengeId, code }, schema: signedInSchema });
}

/** Emails a new code, which replaces the last one. */
export function sendNewCode(challengeId: string): Promise<ApiResult<LoginChallenge>> {
  return apiRequest("/staff/log-in/new-code/", { method: "POST", body: { challengeId }, schema: challengeSchema });
}

/** Who the token belongs to. Each call counts as activity, restarting the backend's hour. */
export function getSignedInStaff(token: string): Promise<ApiResult<StaffMember>> {
  return apiRequest("/staff/me/", { schema: staffSchema, headers: bearer(token) });
}

/** Revokes the token, so the session ends everywhere. */
export function logOut(token: string): Promise<ApiResult<null>> {
  return apiRequest("/staff/log-out/", { method: "POST", schema: noContent, headers: bearer(token) });
}
