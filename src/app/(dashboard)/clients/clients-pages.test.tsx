import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND");
  })
);
vi.mock("next/navigation", () => ({ notFound, redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireStaff: async () => ({ staff: { email: "tunde@ifnotgod.com" }, token: "t0ken", expiresAt: 0 }) }));
vi.mock("@/lib/actions/clients", () => ({ sendPasswordResetAction: vi.fn() }));
vi.mock("@/lib/actions/subscriptions", () => ({ cancelSubscriptionAction: vi.fn(), keepSubscriptionAction: vi.fn() }));
// The catalogue still comes from the stand-in, which keeps changes in a cookie; these tests start with none.
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

type Summary = { id: string; fullName: string; businessName?: string; email: string; planName: string | null; planStatus: "active" | "cancelled" | "none"; joinedOn: string };
const ada: Summary = { id: "2", fullName: "Ada Obi", businessName: "Obi Logistics", email: "ada@obilogistics.com", planName: "Growth", planStatus: "active", joinedOn: "2026-10-08" };
const grace: Summary = { id: "4", fullName: "Grace Okon", businessName: "Okon Events", email: "grace@okonevents.com", planName: "Pro", planStatus: "active", joinedOn: "2026-05-14" };
const musa: Summary = { id: "6", fullName: "Musa Bello", businessName: "Bello Autos", email: "musa@belloautos.ng", planName: null, planStatus: "none", joinedOn: "2026-11-06" };
const history = [
  { id: "3", at: "2026-10-08T09:20:00Z", text: "Subscribed to Growth, monthly", by: "the client" },
  { id: "1", at: "2026-10-08T09:00:00Z", text: "Signed up", by: "the client" },
];
const growth = {
  planId: "growth",
  billingPeriod: "monthly",
  status: "active",
  currentPeriodEnd: "2026-11-12",
  reminder: { dueOn: "2026-11-09", sentOn: null },
  changesLeftThisMonth: 0,
  setupFeePaidOn: "2026-10-12",
  serviceIds: ["lead-follow-up"],
  pendingPlanId: null,
  payments: [{ id: "9", paidOn: "2026-10-12", description: "Growth, monthly, and setup fee", amount: 140000 }],
};

const api = vi.hoisted(() => ({ searchClients: vi.fn(), getClient: vi.fn(), getSubscription: vi.fn() }));
vi.mock("@/lib/api/clients", () => ({ searchClients: api.searchClients, getClient: api.getClient }));
vi.mock("@/lib/api/subscriptions", () => ({ getSubscription: api.getSubscription }));

api.searchClients.mockImplementation(async (_token: string, { query, withoutPlan }: { query: string; withoutPlan?: boolean }) => {
  if (query === "nobody") return { ok: true, data: { items: [], total: 0, page: 1, pageSize: 10 } };
  if (withoutPlan) return { ok: true, data: { items: [musa], total: 3, page: 1, pageSize: 10 } };
  return { ok: true, data: { items: [ada, grace, musa], total: 13, page: 1, pageSize: 10 } };
});
api.getClient.mockImplementation(async (_token: string, id: string) => {
  if (id === ada.id) return { ok: true, data: { ...ada, signInMethod: "password", history } };
  if (id === grace.id) return { ok: true, data: { ...grace, signInMethod: "google", history: [] } };
  return { ok: false, error: { code: "NOT_FOUND", status: 404, message: "", fieldErrors: {} } };
});
api.getSubscription.mockImplementation(async (_token: string, id: string) => ({ ok: true, data: id === ada.id ? growth : null }));

import ClientPage from "./[id]/page";
import ClientsPage from "./page";

const list = (search: Record<string, string> = {}) => ClientsPage({ params: Promise.resolve({}), searchParams: Promise.resolve(search) });
const details = (id: string, search: Record<string, string> = {}) =>
  ClientPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve(search) });

describe("clients list", () => {
  it("shows how many clients there are, with links to each", async () => {
    render(await list());

    expect(screen.getByRole("status")).toHaveTextContent("13 clients");
    expect(screen.getByRole("link", { name: "Ada Obi" })).toHaveAttribute("href", "/clients/2");
    expect(api.searchClients).toHaveBeenCalledWith("t0ken", { query: "", page: 1, withoutPlan: false });
    expect(screen.getByRole("navigation", { name: "Pages" })).toHaveTextContent("Page 1 of 2");
  });

  it("keeps the search in the box and in the page links", async () => {
    render(await list({ q: "a", page: "1" }));

    expect(screen.getByLabelText("Search by name, business or email")).toHaveValue("a");
    expect(screen.getByRole("link", { name: "Clear search" })).toHaveAttribute("href", "/clients");
  });

  it("lists clients without a plan, keeping that filter while searching", async () => {
    render(await list({ plan: "none" }));

    expect(screen.getByRole("status")).toHaveTextContent("3 clients without a plan");
    expect(screen.getByRole("search").querySelector('input[name="plan"]')).toHaveValue("none");
    expect(screen.getByRole("link", { name: "Show all clients" })).toHaveAttribute("href", "/clients");
    expect(screen.queryByRole("link", { name: "Ada Obi" })).not.toBeInTheDocument();
  });

  it("explains a search with no matches", async () => {
    render(await list({ q: "nobody" }));

    expect(screen.getByRole("status")).toHaveTextContent("0 clients match “nobody”");
    expect(screen.getByRole("heading", { name: "No clients match your search" })).toBeInTheDocument();
  });
});

describe("client details", () => {
  it("shows the account, plan status and history", async () => {
    render(await details("2"));

    expect(screen.getByRole("heading", { level: 1, name: "Ada Obi" })).toBeInTheDocument();
    expect(screen.getByText("Obi Logistics · ada@obilogistics.com")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Growth plan" })).toBeInTheDocument();
    const history = screen.getByRole("region", { name: "History" });
    expect(within(history).getAllByRole("listitem")[0]).toHaveTextContent("Subscribed to Growth, monthly");
  });

  it("says when a renewal hasn't been paid, and until when the plan keeps working", async () => {
    api.getSubscription.mockResolvedValueOnce({
      ok: true,
      data: { ...growth, paymentDue: { amount: 40000, workingUntil: "2026-11-14", payUrl: null } },
    });

    render(await details("2"));

    expect(screen.getByRole("note")).toHaveTextContent("Renewal payment not received yet. ₦40,000 is due.");
    expect(screen.getByRole("note")).toHaveTextContent("Everything keeps working until 14 November 2026");
  });

  it("offers a password reset to password clients, behind a confirmation", async () => {
    render(await details("2"));

    expect(screen.getByRole("button", { name: "Send a password reset email" })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("explains why Google clients have no password reset", async () => {
    render(await details("4"));

    expect(screen.queryByRole("button", { name: "Send a password reset email" })).not.toBeInTheDocument();
    expect(screen.getByText(/signs in with Google, so there's no password to reset/)).toBeInTheDocument();
  });

  it.each([
    ["sent", "Password reset email sent."],
    ["failed", "We couldn't send the password reset email. Please try again."],
  ])("confirms a reset that was %s", async (reset, text) => {
    render(await details("2", { reset }));

    expect(screen.getByRole("status")).toHaveTextContent(text);
  });

  it("shows not found for an unknown client", async () => {
    await expect(details("nope")).rejects.toThrow("NOT_FOUND");
  });
});
