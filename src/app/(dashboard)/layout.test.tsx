import { afterEach, describe, expect, it, vi } from "vitest";

const notFound = vi.hoisted(() => vi.fn(() => {
  throw new Error("NOT_FOUND");
}));
vi.mock("next/navigation", () => ({ notFound, usePathname: () => "/" }));

import DashboardLayout from "./layout";

describe("dashboard layout before staff log in exists", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("shows nothing on the live site", () => {
    vi.stubEnv("VERCEL_ENV", "production");

    expect(() => DashboardLayout({ children: null, params: Promise.resolve({}) })).toThrow("NOT_FOUND");
  });

  it("works on previews and locally", () => {
    vi.stubEnv("VERCEL_ENV", "preview");

    expect(() => DashboardLayout({ children: null, params: Promise.resolve({}) })).not.toThrow();
  });
});
