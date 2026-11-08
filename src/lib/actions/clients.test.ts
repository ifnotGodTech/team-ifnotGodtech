import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signedIn: true,
  reset: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({
  requireStaff: async () => {
    if (!mocks.signedIn) mocks.redirect("/login");
    return { staff: { id: "s1", name: "Tunde", email: "tunde@ifnotgod.com" }, expiresAt: 0 };
  },
}));
vi.mock("@/lib/api", () => ({ getBackend: () => ({ sendPasswordReset: mocks.reset }) }));

import { sendPasswordResetAction } from "./clients";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.append(key, value));
  return data;
};
const redirectedTo = (run: Promise<unknown>) => run.then(() => null, (error: Error) => error.message.replace("REDIRECT ", ""));

describe("sendPasswordResetAction", () => {
  beforeEach(() => {
    mocks.signedIn = true;
    mocks.reset.mockReset();
  });

  it("refuses signed-out callers", async () => {
    mocks.signedIn = false;

    expect(await redirectedTo(sendPasswordResetAction(form({ clientId: "c-ada" })))).toBe("/login");
    expect(mocks.reset).not.toHaveBeenCalled();
  });

  it("sends the email, saying who sent it, and confirms", async () => {
    mocks.reset.mockResolvedValueOnce({ ok: true, data: null });

    expect(await redirectedTo(sendPasswordResetAction(form({ clientId: "c-ada" })))).toBe("/clients/c-ada?reset=sent");
    expect(mocks.reset).toHaveBeenCalledWith("c-ada", "tunde@ifnotgod.com");
  });

  it("says when the email couldn't be sent", async () => {
    mocks.reset.mockResolvedValueOnce({ ok: false, error: { code: "UNAVAILABLE" } });

    expect(await redirectedTo(sendPasswordResetAction(form({ clientId: "c-ada" })))).toBe("/clients/c-ada?reset=failed");
  });

  it("treats a backend that can't be reached as a failure, not a crash", async () => {
    mocks.reset.mockRejectedValueOnce(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await redirectedTo(sendPasswordResetAction(form({ clientId: "c-ada" })))).toBe("/clients/c-ada?reset=failed");
  });
});
