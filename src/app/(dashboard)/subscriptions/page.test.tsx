import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ failing: false, listSubscriptions: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireStaff: async () => ({ staff: { email: "tunde@ifnotgod.com" }, token: "t0ken", expiresAt: 0 }) }));
vi.mock("@/lib/api/subscriptions", () => ({ listSubscriptions: mocks.listSubscriptions }));

const row = (clientName: string, extra: Record<string, unknown> = {}) => ({
  clientId: clientName.split(" ")[0].toLowerCase(),
  clientName,
  planName: "Growth",
  pendingPlanName: null,
  billingPeriod: "monthly",
  status: "active",
  currentPeriodEnd: "2026-11-13",
  servicesChosen: 6,
  servicesIncluded: 6,
  ...extra,
});
const counts = { all: 10, active: 8, renewing: 4, cancelled: 2 };
const rows = {
  all: [row("Ifeoma Nwosu", { pendingPlanName: "Pro", billingPeriod: "twelve-months" }), row("Tolu Bakare", { servicesChosen: 4 })],
  cancelled: [
    row("Kunle Ade", { planName: "Starter", status: "cancelled", servicesIncluded: 2, servicesChosen: 0 }),
    row("Funmi Adeyemi", { planName: "Pro", status: "cancelled", servicesIncluded: 12, servicesChosen: 12 }),
  ],
};
mocks.listSubscriptions.mockImplementation(async (_token: string, filter: "all" | "cancelled") =>
  mocks.failing
    ? { ok: false, error: { code: "UNAVAILABLE", message: "The dashboard can't reach the server right now." } }
    : { ok: true, data: { items: rows[filter] ?? rows.all, counts } }
);

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
