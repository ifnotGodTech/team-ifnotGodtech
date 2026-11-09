"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkCode, logOut, sendNewCode, startLogIn } from "@/lib/api/staffAuth";
import { IDLE_LIMIT_MS } from "./constants";
import { INITIAL_AUTH_STATE, type AuthFormState } from "./formState";
import { readStaffSession } from "./index";
import { safeNextPath } from "./paths";
import { openJson, sealJson } from "./sealing";
import { checkSession, encodeSession, SESSION_COOKIE, sessionCookieOptions } from "./session";
import { cookieSecret } from "./signing";

// Form actions can be called directly with a POST, so each one checks everything itself. The backend
// counts wrong codes, resends and failed passwords; these actions only explain what it says.

const PENDING_COOKIE = "ifng_staff_login";
const PENDING_MAX_AGE = 10 * 60;
const TIMED_OUT = "Your log in has timed out. Please start again.";

type PendingLogin = { challengeId: string; sentTo: string; next: string };

const logInSchema = z.object({
  email: z.string().trim().min(1, "Enter your work email.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
const codeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the email.");

const failed = (message: string, values: Record<string, string> = {}): AuthFormState => ({ ...INITIAL_AUTH_STATE, formError: message, values });

export async function readPendingLogin(): Promise<PendingLogin | null> {
  const value = (await cookies()).get(PENDING_COOKIE)?.value;
  return value ? openJson<PendingLogin>(value, cookieSecret()) : null;
}

async function savePendingLogin(pending: PendingLogin) {
  // Sealed: the challenge id is half of what logs someone in.
  (await cookies()).set(PENDING_COOKIE, sealJson(pending, cookieSecret()), { ...sessionCookieOptions, maxAge: PENDING_MAX_AGE });
}

/** The log in is over (stopped, used or unknown): start again from the password. */
async function startAgain(reason: "too-many-codes" | "timed-out"): Promise<never> {
  (await cookies()).delete(PENDING_COOKIE);
  redirect(`/login?reason=${reason}`);
}

export async function logInAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const values = { email: String(form.get("email") ?? "") };
  const parsed = logInSchema.safeParse({ email: values.email, password: String(form.get("password") ?? "") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ...INITIAL_AUTH_STATE, fieldErrors, values };
  }

  const result = await startLogIn(parsed.data.email, parsed.data.password);
  if (!result.ok) return failed(result.error.message, values);

  const { challengeId, sentTo } = result.data;
  await savePendingLogin({ challengeId, sentTo, next: safeNextPath(form.get("next")) });
  redirect("/login/code");
}

export async function verifyCodeAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const pending = await readPendingLogin();
  if (!pending) return failed(TIMED_OUT);

  const code = codeSchema.safeParse(form.get("code"));
  if (!code.success) return { ...INITIAL_AUTH_STATE, fieldErrors: { code: code.error.issues[0].message } };

  const result = await checkCode(pending.challengeId, code.data);
  if (!result.ok) {
    if (result.error.detailCode === "TOO_MANY_CODES") return startAgain("too-many-codes");
    if (result.error.detailCode === "LOGIN_ENDED") return startAgain("timed-out");
    return failed(result.error.message);
  }

  const jar = await cookies();
  jar.delete(PENDING_COOKIE);
  jar.set(SESSION_COOKIE, encodeSession(result.data.staff, result.data.token, cookieSecret()), sessionCookieOptions);
  redirect(pending.next);
}

export async function resendCodeAction(): Promise<AuthFormState> {
  const pending = await readPendingLogin();
  if (!pending) return failed(TIMED_OUT);

  const result = await sendNewCode(pending.challengeId);
  if (!result.ok) {
    if (result.error.detailCode === "LOGIN_ENDED") return startAgain("timed-out");
    return failed(result.error.message);
  }

  await savePendingLogin({ ...pending, sentTo: result.data.sentTo });
  return { ...INITIAL_AUTH_STATE, notice: "We've sent a new code. Use the latest one." };
}

export async function logOutAction(): Promise<void> {
  const jar = await cookies();
  const session = checkSession(jar.get(SESSION_COOKIE)?.value, cookieSecret());
  if (session.status === "active") {
    // Revoking the token ends the session everywhere, including any copy of this cookie.
    const result = await logOut(session.token);
    if (!result.ok && result.error.code !== "UNAUTHENTICATED") {
      console.error("[auth] log out couldn't reach the backend; the token ends after an hour without use");
    }
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(PENDING_COOKIE);
  redirect("/login?reason=signed-out");
}

/** "Stay signed in": restarts the hour and returns when the session now ends, or null if the server can't be reached. */
export async function keepAliveAction(): Promise<number | null> {
  const session = await readStaffSession();
  if (session.status === "unavailable") return null;
  if (session.status !== "active") redirect(session.status === "expired" ? "/login?reason=expired" : "/login");
  const now = Date.now();
  (await cookies()).set(SESSION_COOKIE, encodeSession(session.staff, session.token, cookieSecret(), now), sessionCookieOptions);
  return now + IDLE_LIMIT_MS;
}
