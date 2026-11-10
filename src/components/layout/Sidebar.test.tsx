import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("@/lib/auth/actions", () => ({ logOutAction: vi.fn() }));

import { isCurrent, Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("links to every area", () => {
    render(<Sidebar staffEmail="tunde@ifnotgod.com" />);

    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/", "/", "/clients", "/subscriptions", "/leads", "/content"]);
  });

  it("shows how many leads are new, and nothing when none are", () => {
    const { rerender } = render(<Sidebar staffEmail="tunde@ifnotgod.com" newLeads={3} />);
    expect(screen.getByRole("link", { name: "Leads 3 new" })).toHaveAttribute("href", "/leads");

    rerender(<Sidebar staffEmail="tunde@ifnotgod.com" newLeads={0} />);
    expect(screen.getByRole("link", { name: "Leads" })).toBeInTheDocument();
  });

  it("shows who is signed in, with Log out", () => {
    render(<Sidebar staffEmail="tunde@ifnotgod.com" />);

    expect(screen.getByText("tunde@ifnotgod.com").parentElement).toHaveTextContent("Signed in as tunde@ifnotgod.com");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("marks the current area, including its inner pages", () => {
    nav.pathname = "/clients/c1";
    render(<Sidebar staffEmail="tunde@ifnotgod.com" />);

    expect(screen.getByRole("link", { name: "Clients" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("only marks Overview on the overview itself", () => {
    expect(isCurrent("/", "/")).toBe(true);
    expect(isCurrent("/clients", "/")).toBe(false);
    expect(isCurrent("/clientsx", "/clients")).toBe(false);
  });
});
