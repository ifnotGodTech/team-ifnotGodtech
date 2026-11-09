import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  getSignedInStaff: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`);
  }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (mocks.cookie ? { value: mocks.cookie } : undefined) }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/api/staffAuth", () => ({ getSignedInStaff: mocks.getSignedInStaff }));

import { BACKEND_UNAVAILABLE, readStaffSession, requireStaff } from "./index";
import { encodeSession } from "./session";
import { cookieSecret } from "./signing";

const staff = { id: "1", name: "Tunde Bakare", email: "tunde@ifnotgod.com" };

describe("the staff session check", () => {
  beforeEach(() => {
    mocks.cookie = undefined;
    mocks.getSignedInStaff.mockReset();
    mocks.redirect.mockClear();
  });

  it("asks the backend to confirm the token, and uses who it says is signed in", async () => {
    mocks.cookie = encodeSession({ ...staff, name: "Old name" }, "t0ken", cookieSecret());
    mocks.getSignedInStaff.mockResolvedValueOnce({ ok: true, data: staff });

    expect(await readStaffSession()).toMatchObject({ status: "active", staff, token: "t0ken" });
    expect(mocks.getSignedInStaff).toHaveBeenCalledWith("t0ken");
  });

  it("treats a token the backend has ended as an expired session", async () => {
    mocks.cookie = encodeSession(staff, "revoked", cookieSecret());
    mocks.getSignedInStaff.mockResolvedValue({ ok: false, error: apiError("UNAUTHENTICATED", 401) });

    expect(await readStaffSession()).toEqual({ status: "expired" });
    await expect(requireStaff()).rejects.toThrow("REDIRECT /login?reason=expired");
  });

  it("doesn't call the backend without a session cookie", async () => {
    await expect(requireStaff()).rejects.toThrow("REDIRECT /login");
    expect(mocks.getSignedInStaff).not.toHaveBeenCalled();
  });

  it("says the server can't be reached instead of logging the person out", async () => {
    mocks.cookie = encodeSession(staff, "t0ken", cookieSecret());
    mocks.getSignedInStaff.mockResolvedValue({ ok: false, error: apiError("UNAVAILABLE") });

    expect(await readStaffSession()).toEqual({ status: "unavailable" });
    await expect(requireStaff()).rejects.toThrow(BACKEND_UNAVAILABLE);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
