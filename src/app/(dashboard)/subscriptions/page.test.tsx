import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ failing: false }));
vi.mock("@/lib/auth", () => ({ requireStaff: async () => ({ staff: { email: "tunde@ifnotgod.com" }, expiresAt: 0 }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/api", async (original) => {
  const real = await original<typeof import("@/lib/api")>();
  return {
    ...real,
    getBackend: () => {
      const backend = real.getBackend();
      return mocks.failing
        ? { ...backend, listSubscriptions: async () => ({ ok: false, error: { code: "UNAVAILABLE", message: "The dashboard can't reach the server right now." } }) }
        : backend;
    },
  };
});

import SubscriptionsPage from "./page";

const show = (search: Record<string, string> = {}) => SubscriptionsPage({ params: Promise.resolve({}), searchParams: Promise.resolve(search) });

describe("subscriptions page", () => {
  it("shows every filter with its count, marking the current one", async () => {
    render(await show());

    const filters = screen.getByRole("navigation", { name: "Show" });
    expect(within(filters).getByRole("link", { name: "All (10)" })).toHaveAttribute("aria-current", "page");
    expect(within(filters).getByRole("link", { name: "Renewing in 7 days (4)" })).toHaveAttribute("href", "/subscriptions?show=renewing");
  });

  it("lists cancelled plans still running, with when they end", async () => {
    render(await show({ show: "cancelled" }));

    const rows = within(screen.getByRole("region", { name: "Subscription list" })).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent(/Kunle Ade.*Cancelled.*Ends/);
  });

  it("shows a waiting plan change and services chosen", async () => {
    render(await show());

    expect(screen.getByRole("row", { name: /Ifeoma Nwosu/ })).toHaveTextContent("Growth → Pro at renewal");
    expect(screen.getByRole("row", { name: /Tolu Bakare/ })).toHaveTextContent("4 of 6");
  });

  it("ignores an unknown filter", async () => {
    render(await show({ show: "everything" }));

    expect(screen.getByRole("link", { name: "All (10)" })).toHaveAttribute("aria-current", "page");
  });

  it("says plainly when the backend can't be reached", async () => {
    mocks.failing = true;
    render(await show());
    mocks.failing = false;

    expect(screen.getByText("The dashboard can't reach the server right now.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toBeInTheDocument();
  });
});
