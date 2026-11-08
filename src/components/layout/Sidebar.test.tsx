import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

import { isCurrent, Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("links to every area", () => {
    render(<Sidebar />);

    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/", "/", "/clients", "/subscriptions", "/content"]);
  });

  it("marks the current area, including its inner pages", () => {
    nav.pathname = "/clients/c1";
    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Clients" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("only marks Overview on the overview itself", () => {
    expect(isCurrent("/", "/")).toBe(true);
    expect(isCurrent("/clients", "/")).toBe(false);
    expect(isCurrent("/clientsx", "/clients")).toBe(false);
  });
});
