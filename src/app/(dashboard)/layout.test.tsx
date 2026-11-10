import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  requireStaff: vi.fn(async () => ({ staff: { id: "s1", name: "Tunde", email: "tunde@ifnotgod.com" }, expiresAt: 0 })),
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, usePathname: () => "/" }));
vi.mock("@/lib/auth", () => ({ requireStaff: mocks.requireStaff }));
vi.mock("@/lib/api/leads", () => ({ listLeads: async () => ({ ok: true, data: { items: [], total: 2, page: 1, pageSize: 1, counts: { all: 5, new: 2, contacted: 2, closed: 1 } } }) }));
vi.mock("@/lib/auth/actions", () => ({ keepAliveAction: vi.fn(), logOutAction: vi.fn() }));

import DashboardLayout from "./layout";

const props = { children: null, params: Promise.resolve({}) };

describe("dashboard layout", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("shows nothing on the live site until the real backend is connected", async () => {
    vi.stubEnv("VERCEL_ENV", "production");

    await expect(DashboardLayout(props)).rejects.toThrow("NOT_FOUND");
  });

  it("checks the staff session before showing anything", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");

    await DashboardLayout(props);

    expect(mocks.requireStaff).toHaveBeenCalled();
  });
});
