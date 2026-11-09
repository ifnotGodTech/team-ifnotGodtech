import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    jar: {
      get: (name: string) => (values.has(name) ? { value: values.get(name)! } : undefined),
      set: (name: string, value: string) => void values.set(name, value),
      delete: (name: string) => void values.delete(name),
    },
    redirect: vi.fn((path: string) => {
      throw new Error(`REDIRECT ${path}`);
    }),
    api: { startLogIn: vi.fn(), checkCode: vi.fn(), sendNewCode: vi.fn(), logOut: vi.fn(), getSignedInStaff: vi.fn() },
  };
});
vi.mock("next/headers", () => ({ cookies: async () => mocks.jar }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/api/staffAuth", () => mocks.api);

import { keepAliveAction, logInAction, logOutAction, resendCodeAction, verifyCodeAction } from "./actions";
import { INITIAL_AUTH_STATE } from "./formState";
import { checkSession, SESSION_COOKIE } from "./session";
import { cookieSecret } from "./signing";

const PENDING = "ifng_staff_login";
const staff = { id: "1", name: "Tunde Bakare", email: "tunde@ifnotgod.com" };
const challenge = { challengeId: "c-1", sentTo: "tunde@ifnotgod.com", expiresAt: "2026-11-09T10:10:00Z" };
const refused = (code: Parameters<typeof apiError>[0], status: number, message?: string, detailCode?: string) => ({
  ok: false,
  error: apiError(code, status, { message, detailCode }),
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.append(key, value));
  return data;
};
const redirectedTo = (run: Promise<unknown>) => run.then(() => null, (error: Error) => error.message.replace("REDIRECT ", ""));

async function reachCodeStep(next = "/clients") {
  mocks.api.startLogIn.mockResolvedValueOnce({ ok: true, data: challenge });
  expect(await redirectedTo(logInAction(INITIAL_AUTH_STATE, form({ email: "tunde@ifnotgod.com", password: "pw", next })))).toBe("/login/code");
}

async function signIn() {
  await reachCodeStep();
  mocks.api.checkCode.mockResolvedValueOnce({ ok: true, data: { token: "t0ken", staff } });
  await redirectedTo(verifyCodeAction(INITIAL_AUTH_STATE, form({ code: "123456" })));
}

describe("log in actions", () => {
  beforeEach(() => {
    mocks.values.clear();
    Object.values(mocks.api).forEach((fn) => fn.mockReset());
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("explains missing details and keeps the email, never the password, without calling the backend", async () => {
    const state = await logInAction(INITIAL_AUTH_STATE, form({ email: "tunde@", password: "" }));

    expect(state.fieldErrors).toEqual({ email: "Enter a valid email address.", password: "Enter your password." });
    expect(state.values).toEqual({ email: "tunde@" });
    expect(mocks.api.startLogIn).not.toHaveBeenCalled();
  });

  it("shows the backend's reason for refusing the password, without starting the code step", async () => {
    mocks.api.startLogIn.mockResolvedValueOnce(refused("VALIDATION", 400, "That email and password don't match a team account."));

    const state = await logInAction(INITIAL_AUTH_STATE, form({ email: "tunde@ifnotgod.com", password: "wrong" }));

    expect(state.formError).toBe("That email and password don't match a team account.");
    expect(state.values).toEqual({ email: "tunde@ifnotgod.com" });
    expect(mocks.values.size).toBe(0);
  });

  it("keeps the log in in progress in an encrypted cookie", async () => {
    await reachCodeStep();

    expect(mocks.values.get(PENDING)).not.toContain("c-1");
  });

  it("signs in with the emailed code, keeping the token in the session cookie, then goes where the person was heading", async () => {
    await reachCodeStep("/clients");
    mocks.api.checkCode.mockResolvedValueOnce({ ok: true, data: { token: "t0ken", staff } });

    expect(await redirectedTo(verifyCodeAction(INITIAL_AUTH_STATE, form({ code: "123456" })))).toBe("/clients");
    expect(mocks.api.checkCode).toHaveBeenCalledWith("c-1", "123456");
    expect(checkSession(mocks.values.get(SESSION_COOKIE), cookieSecret())).toMatchObject({ status: "active", staff, token: "t0ken" });
    expect(mocks.values.has(PENDING)).toBe(false);
  });

  it("never sends someone to another website after logging in", async () => {
    await reachCodeStep("https://evil.example");
    mocks.api.checkCode.mockResolvedValueOnce({ ok: true, data: { token: "t0ken", staff } });

    expect(await redirectedTo(verifyCodeAction(INITIAL_AUTH_STATE, form({ code: "123456" })))).toBe("/");
  });

  it("asks for a 6-digit code before sending it to the backend", async () => {
    await reachCodeStep();

    expect((await verifyCodeAction(INITIAL_AUTH_STATE, form({ code: "12" }))).fieldErrors.code).toBe("Enter the 6-digit code from the email.");
    expect(mocks.api.checkCode).not.toHaveBeenCalled();
  });

  it("explains a wrong or expired code, keeping the log in going", async () => {
    await reachCodeStep();
    mocks.api.checkCode.mockResolvedValueOnce(refused("VALIDATION", 400, "That code isn't right. Check it, or send a new one.", "WRONG_CODE"));

    expect((await verifyCodeAction(INITIAL_AUTH_STATE, form({ code: "000000" }))).formError).toBe("That code isn't right. Check it, or send a new one.");
    expect(mocks.values.has(PENDING)).toBe(true);
  });

  it("starts again when the backend stops the log in after too many wrong codes", async () => {
    await reachCodeStep();
    mocks.api.checkCode.mockResolvedValueOnce(refused("RATE_LIMITED", 429, "Too many wrong codes.", "TOO_MANY_CODES"));

    expect(await redirectedTo(verifyCodeAction(INITIAL_AUTH_STATE, form({ code: "000000" })))).toBe("/login?reason=too-many-codes");
    expect(mocks.values.has(PENDING)).toBe(false);
  });

  it("starts again when the log in has ended", async () => {
    await reachCodeStep();
    mocks.api.sendNewCode.mockResolvedValueOnce(refused("CONFLICT", 409, "Your log in has timed out.", "LOGIN_ENDED"));

    expect(await redirectedTo(resendCodeAction())).toBe("/login?reason=timed-out");
  });

  it("sends a new code, and explains when no more can be sent", async () => {
    await reachCodeStep();
    mocks.api.sendNewCode.mockResolvedValueOnce({ ok: true, data: challenge });
    mocks.api.sendNewCode.mockResolvedValueOnce(refused("RATE_LIMITED", 429, "We've sent several codes already. Please log in again.", "TOO_MANY_RESENDS"));

    expect((await resendCodeAction()).notice).toBe("We've sent a new code. Use the latest one.");
    expect((await resendCodeAction()).formError).toBe("We've sent several codes already. Please log in again.");
  });

  it("refuses the code step without a log in in progress", async () => {
    expect((await verifyCodeAction(INITIAL_AUTH_STATE, form({ code: "123456" }))).formError).toMatch(/timed out/);
    expect((await resendCodeAction()).formError).toMatch(/timed out/);
  });

  it("logs out by revoking the token with the backend, then clearing the cookie", async () => {
    await signIn();
    mocks.api.logOut.mockResolvedValueOnce({ ok: true, data: null });

    expect(await redirectedTo(logOutAction())).toBe("/login?reason=signed-out");
    expect(mocks.api.logOut).toHaveBeenCalledWith("t0ken");
    expect(mocks.values.has(SESSION_COOKIE)).toBe(false);
  });

  it("still clears the cookie when the backend can't be reached to log out", async () => {
    await signIn();
    mocks.api.logOut.mockResolvedValueOnce(refused("UNAVAILABLE", 503));

    expect(await redirectedTo(logOutAction())).toBe("/login?reason=signed-out");
    expect(mocks.values.has(SESSION_COOKIE)).toBe(false);
  });

  it("keeps a confirmed session going, and refuses anyone signed out", async () => {
    expect(await redirectedTo(keepAliveAction())).toBe("/login");

    await signIn();
    mocks.api.getSignedInStaff.mockResolvedValueOnce({ ok: true, data: staff });
    expect(await keepAliveAction()).toBeGreaterThan(Date.now() + 59 * 60 * 1000);

    mocks.api.getSignedInStaff.mockResolvedValueOnce(refused("UNAUTHENTICATED", 401));
    expect(await redirectedTo(keepAliveAction())).toBe("/login?reason=expired");
  });
});
