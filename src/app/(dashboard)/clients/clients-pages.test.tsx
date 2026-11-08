import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND");
  })
);
vi.mock("next/navigation", () => ({ notFound, redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireStaff: async () => ({ staff: { email: "tunde@ifnotgod.com" }, expiresAt: 0 }) }));
vi.mock("@/lib/actions/clients", () => ({ sendPasswordResetAction: vi.fn() }));
vi.mock("@/lib/actions/subscriptions", () => ({ cancelSubscriptionAction: vi.fn(), keepSubscriptionAction: vi.fn() }));
// The stand-in keeps changes in a cookie; these tests start with none.
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import ClientPage from "./[id]/page";
import ClientsPage from "./page";

const list = (search: Record<string, string> = {}) => ClientsPage({ params: Promise.resolve({}), searchParams: Promise.resolve(search) });
const details = (id: string, search: Record<string, string> = {}) =>
  ClientPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve(search) });

describe("clients list", () => {
  it("shows how many clients there are, with links to each", async () => {
    render(await list());

    expect(screen.getByRole("status")).toHaveTextContent("13 clients");
    expect(screen.getByRole("link", { name: "Ada Obi" })).toHaveAttribute("href", "/clients/c-ada");
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
    render(await details("c-ada"));

    expect(screen.getByRole("heading", { level: 1, name: "Ada Obi" })).toBeInTheDocument();
    expect(screen.getByText("Obi Logistics · ada@obilogistics.com")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Growth plan" })).toBeInTheDocument();
    const history = screen.getByRole("region", { name: "History" });
    expect(within(history).getAllByRole("listitem")[0]).toHaveTextContent("Subscribed to Growth, monthly");
  });

  it("offers a password reset to password clients, behind a confirmation", async () => {
    render(await details("c-ada"));

    expect(screen.getByRole("button", { name: "Send a password reset email" })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("explains why Google clients have no password reset", async () => {
    render(await details("c-grace"));

    expect(screen.queryByRole("button", { name: "Send a password reset email" })).not.toBeInTheDocument();
    expect(screen.getByText(/signs in with Google, so there's no password to reset/)).toBeInTheDocument();
  });

  it.each([
    ["sent", "Password reset email sent."],
    ["failed", "We couldn't send the password reset email. Please try again."],
  ])("confirms a reset that was %s", async (reset, text) => {
    render(await details("c-ada", { reset }));

    expect(screen.getByRole("status")).toHaveTextContent(text);
  });

  it("shows not found for an unknown client", async () => {
    await expect(details("nope")).rejects.toThrow("NOT_FOUND");
  });
});
