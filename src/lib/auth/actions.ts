"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getBackend } from "@/lib/api";
import type { ApiResult } from "@/lib/api";
import { MAX_CODE_ATTEMPTS } from "./constants";
import { INITIAL_AUTH_STATE, type AuthFormState } from "./formState";
import { requireStaff } from "./index";
import { safeNextPath } from "./paths";
import { encodeSession, SESSION_COOKIE, sessionCookieOptions } from "./session";
import { cookieSecret, signJson, verifyJson } from "./signing";

// Form actions can be called directly with a POST, so each one checks everything itself.

const PENDING_COOKIE = "ifng_staff_login";
const PENDING_MAX_AGE = 10 * 60;

type PendingLogin = { challengeId: string; sentTo: string; next: string; attempts: number };

const logInSchema = z.object({
  email: z.string().trim().min(1, "Enter your work email.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
const codeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the email.");

const failed = (message: string, values: Record<string, string> = {}): AuthFormState => ({ ...INITIAL_AUTH_STATE, formError: message, values });

async function call<T>(run: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  try {
    return await run();
  } catch (error) {
    console.error("[auth] backend call failed", error instanceof Error ? error.name : "");
    return { ok: false, error: { code: "UNAVAILABLE", status: null, message: "The dashboard can't reach the server right now. Please try again in a moment.", fieldErrors: {} } };
  }
}

export async function readPendingLogin(): Promise<PendingLogin | null> {
  const value = (await cookies()).get(PENDING_COOKIE)?.value;
  return value ? verifyJson<PendingLogin>(value, cookieSecret()) : null;
}

async function savePendingLogin(pending: PendingLogin) {
  (await cookies()).set(PENDING_COOKIE, signJson(pending, cookieSecret()), { ...sessionCookieOptions, maxAge: PENDING_MAX_AGE });
}

export async function logInAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const values = { email: String(form.get("email") ?? "") };
  const parsed = logInSchema.safeParse({ email: values.email, password: String(form.get("password") ?? "") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ...INITIAL_AUTH_STATE, fieldErrors, values };
  }

  const result = await call(() => getBackend().logIn(parsed.data.email, parsed.data.password));
  if (!result.ok) return failed(result.error.message, values);

  await savePendingLogin({ ...result.data, next: safeNextPath(form.get("next")), attempts: 0 });
  redirect("/login/code");
}

export async function verifyCodeAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const pending = await readPendingLogin();
  if (!pending) return failed("Your log in has timed out. Please start again.");

  const code = codeSchema.safeParse(form.get("code"));
  if (!code.success) return { ...INITIAL_AUTH_STATE, fieldErrors: { code: code.error.issues[0].message } };

  const result = await call(() => getBackend().verifyCode(pending.challengeId, code.data));
  if (!result.ok) {
    const attempts = pending.attempts + 1;
    if (attempts >= MAX_CODE_ATTEMPTS) {
      (await cookies()).delete(PENDING_COOKIE);
      redirect("/login?reason=too-many-codes");
    }
    await savePendingLogin({ ...pending, attempts });
    return failed(result.error.message);
  }

  const jar = await cookies();
  jar.delete(PENDING_COOKIE);
  jar.set(SESSION_COOKIE, encodeSession(result.data, cookieSecret()), sessionCookieOptions);
  redirect(pending.next);
}

export async function resendCodeAction(): Promise<AuthFormState> {
  const pending = await readPendingLogin();
  if (!pending) return failed("Your log in has timed out. Please start again.");

  const result = await call(() => getBackend().resendCode(pending.challengeId));
  if (!result.ok) return failed(result.error.message);

  await savePendingLogin({ ...pending, ...result.data, attempts: 0 });
  return { ...INITIAL_AUTH_STATE, notice: "We've sent a new code. Use the latest one." };
}

export async function logOutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(PENDING_COOKIE);
  redirect("/login?reason=signed-out");
}

/** "Stay signed in": restarts the hour and returns when the session now ends. */
export async function keepAliveAction(): Promise<number> {
  const { staff } = await requireStaff();
  (await cookies()).set(SESSION_COOKIE, encodeSession(staff, cookieSecret()), sessionCookieOptions);
  return Date.now() + 60 * 60 * 1000;
}
