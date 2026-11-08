import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ requireStaff: async () => ({ staff: { email: "tunde@ifnotgod.com" }, expiresAt: 0 }) }));
vi.mock("@/lib/actions/content", () => ({ savePlanAction: vi.fn(), saveServiceAction: vi.fn(), setServiceShownAction: vi.fn(), saveGroupAction: vi.fn(), saveSiteTextAction: vi.fn() }));

import SiteContentPage from "./page";

const show = (search: Record<string, string> = {}) => SiteContentPage({ params: Promise.resolve({}), searchParams: Promise.resolve(search) });

describe("site content page", () => {
  it("shows a card for each priced plan, with the price rule", async () => {
    render(await show());

    expect(screen.getByRole("link", { name: "Plans and prices" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("form").map((form) => form.getAttribute("aria-labelledby"))).toEqual(["starter-heading", "growth-heading", "pro-heading"]);
    expect(screen.getByLabelText("Monthly price (₦)", { selector: "#growth-price" })).toHaveValue("40,000");
    expect(screen.getAllByText(/existing subscribers from their next renewal/)).toHaveLength(3);
  });

  it("lists services by group, with how to hide each", async () => {
    render(await show({ tab: "services", saved: "hidden" }));

    expect(screen.getByRole("status")).toHaveTextContent("Service hidden from the website. It keeps running for clients who already have it.");
    const agents = screen.getByRole("region", { name: "AI agents" });
    expect(within(agents).getByText("AI call agent")).toBeInTheDocument();
    expect(within(agents).getAllByText(/In Pro only/)).toHaveLength(2);
    expect(within(agents).getAllByRole("button", { name: "Hide from the website" })).toHaveLength(4);
  });

  it("opens a service to edit, and shows not found for one that doesn't exist", async () => {
    render(await show({ tab: "services", edit: "daily-brief" }));

    expect(screen.getByRole("form", { name: "Edit Daily business brief" })).toBeInTheDocument();
    await expect(show({ tab: "services", edit: "nope" })).rejects.toThrow("NOT_FOUND");
  });

  it("shows the groups with what each plan includes, and the site text", async () => {
    render(await show({ tab: "groups" }));
    expect(screen.getByText("6 services · Starter 1, Growth 3, Pro 6")).toBeInTheDocument();
  });

  it("shows the home page text to edit", async () => {
    render(await show({ tab: "text" }));
    expect(screen.getByLabelText("Home page headline")).toHaveValue("Your business, answering back while you sleep.");
  });
});
