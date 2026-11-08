import { beforeEach, describe, expect, it, vi } from "vitest";

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
  };
});
vi.mock("next/headers", () => ({ cookies: async () => mocks.jar }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { STUB_RULES } from "@/lib/api/stub";
import { keepAliveAction, logInAction, logOutAction, resendCodeAction, verifyCodeAction } from "./actions";
import { INITIAL_AUTH_STATE } from "./formState";
import { SESSION_COOKIE } from "./session";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.append(key, value));
  return data;
};
const redirectedTo = (run: Promise<unknown>) => run.then(() => null, (error: Error) => error.message.replace("REDIRECT ", ""));

async function reachCodeStep(next = "/clients") {
  expect(await redirectedTo(logInAction(INITIAL_AUTH_STATE, form({ email: "tunde@ifnotgod.com", password: "x", next })))).toBe("/login/code");
}

describe("log in actions", () => {
  beforeEach(() => mocks.values.clear());

  it("explains missing details and keeps the email, never the password", async () => {
    const state = await logInAction(INITIAL_AUTH_STATE, form({ email: "tunde@", password: "" }));

    expect(state.fieldErrors).toEqual({ email: "Enter a valid email address.", password: "Enter your password." });
    expect(state.values).toEqual({ email: "tunde@" });
  });

  it("explains a wrong password without starting the code step", async () => {
    const state = await logInAction(INITIAL_AUTH_STATE, form({ email: "tunde@ifnotgod.com", password: STUB_RULES.wrongPassword }));

    expect(state.formError).toBe("That email and password don't match a team account.");
    expect(mocks.values.size).toBe(0);
  });

  it("signs in with the emailed code, then goes where the person was heading", async () => {
    await reachCodeStep("/clients");

    expect(await redirectedTo(verifyCodeAction(INITIAL_AUTH_STATE, form({ code: STUB_RULES.code })))).toBe("/clients");
    expect(mocks.values.has(SESSION_COOKIE)).toBe(true);
    expect(mocks.values.has("ifng_staff_login")).toBe(false);
  });

  it("never sends someone to another website after logging in", async () => {
    await reachCodeStep("https://evil.example");

    expect(await redirectedTo(verifyCodeAction(INITIAL_AUTH_STATE, form({ code: STUB_RULES.code })))).toBe("/");
  });

  it("asks for a 6-digit code before checking it", async () => {
    await reachCodeStep();

    expect((await verifyCodeAction(INITIAL_AUTH_STATE, form({ code: "12" }))).fieldErrors.code).toBe("Enter the 6-digit code from the email.");
  });

  it("starts again after 5 wrong codes", async () => {
    await reachCodeStep();

    for (let attempt = 0; attempt < 4; attempt++) {
      expect((await verifyCodeAction(INITIAL_AUTH_STATE, form({ code: "000000" }))).formError).toMatch(/isn't right/);
    }

    expect(await redirectedTo(verifyCodeAction(INITIAL_AUTH_STATE, form({ code: "000000" })))).toBe("/login?reason=too-many-codes");
    expect(mocks.values.has("ifng_staff_login")).toBe(false);
  });

  it("sends a new code", async () => {
    await reachCodeStep();

    expect((await resendCodeAction()).notice).toBe("We've sent a new code. Use the latest one.");
  });

  it("refuses the code step without a log in in progress", async () => {
    expect((await verifyCodeAction(INITIAL_AUTH_STATE, form({ code: STUB_RULES.code }))).formError).toMatch(/timed out/);
    expect((await resendCodeAction()).formError).toMatch(/timed out/);
  });

  it("logs out", async () => {
    await reachCodeStep();
    await redirectedTo(verifyCodeAction(INITIAL_AUTH_STATE, form({ code: STUB_RULES.code })));

    expect(await redirectedTo(logOutAction())).toBe("/login?reason=signed-out");
    expect(mocks.values.has(SESSION_COOKIE)).toBe(false);
  });

  it("keeps a signed-in session going, and refuses anyone signed out", async () => {
    expect(await redirectedTo(keepAliveAction())).toBe("/login");

    await reachCodeStep();
    await redirectedTo(verifyCodeAction(INITIAL_AUTH_STATE, form({ code: STUB_RULES.code })));
    expect(await keepAliveAction()).toBeGreaterThan(Date.now() + 59 * 60 * 1000);
  });
});
