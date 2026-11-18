import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ listLeads: vi.fn(), getLead: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireStaff: async () => ({ staff: { email: "tunde@ifnotgod.com" }, token: "t0ken", expiresAt: 0 }) }));
vi.mock("@/lib/actions/leads", () => ({ setLeadStatusAction: vi.fn() }));
vi.mock("@/lib/api/leads", () => api);

import LeadPage from "./[id]/page";
import LeadsPage from "./page";

const kemi = { id: "7", fullName: "Kemi Adebayo", organisation: "Adebayo Pharmacy", planName: "Growth", receivedAt: "2026-11-11T08:41:00Z", status: "new" };
const ruth = { id: "5", fullName: "Ruth Okeke", organisation: null, planName: null, receivedAt: "2026-11-09T10:00:00Z", status: "contacted" };
const counts = { all: 2, new: 1, contacted: 1, closed: 0 };
const detail = {
  ...kemi,
  email: "kemi@adebayopharmacy.ng",
  phone: null,
  challenge: "We miss WhatsApp orders at night.",
  deletedOn: "2028-11-10",
};

const list = (search: Record<string, string> = {}) => LeadsPage({ params: Promise.resolve({}), searchParams: Promise.resolve(search) });
const open = (id: string, search: Record<string, string> = {}) => LeadPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve(search) });

describe("leads", () => {
  beforeEach(() => {
    api.listLeads.mockReset();
    api.getLead.mockReset();
  });

  it("lists requests newest first, with each status's count and the filter in the address", async () => {
    api.listLeads.mockResolvedValueOnce({ ok: true, data: { items: [kemi, ruth], total: 2, page: 1, pageSize: 20, counts } });

    render(await list());

    expect(api.listLeads).toHaveBeenCalledWith("t0ken", "all", 1);
    expect(screen.getByRole("link", { name: "All (2)" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "New (1)" })).toHaveAttribute("href", "/leads?show=new");
    const rows = within(screen.getByRole("region", { name: "Lead list" })).getAllByRole("row");
    expect(rows[1]).toHaveTextContent(/Kemi Adebayo.*Adebayo Pharmacy.*Growth.*New/);
    expect(rows[2]).toHaveTextContent(/Ruth Okeke.*No business given.*Not sure yet.*Contacted/);
    expect(screen.getByRole("link", { name: "Kemi Adebayo" })).toHaveAttribute("href", "/leads/7");
  });

  it("explains an empty filter, and a backend that can't be reached", async () => {
    api.listLeads.mockResolvedValueOnce({ ok: true, data: { items: [], total: 0, page: 1, pageSize: 20, counts: { ...counts, closed: 0 } } });
    render(await list({ show: "closed" }));
    expect(screen.getByText("No closed leads")).toBeInTheDocument();
    expect(api.listLeads).toHaveBeenCalledWith("t0ken", "closed", 1);

    api.listLeads.mockResolvedValueOnce({ ok: false, error: { code: "UNAVAILABLE", message: "The dashboard can't reach the server right now." } });
    render(await list());
    expect(screen.getByText("The dashboard can't reach the server right now.")).toBeInTheDocument();
  });

  it("shows a request with how to get back to them, and the next step for its status", async () => {
    api.getLead.mockResolvedValueOnce({ ok: true, data: detail });

    render(await open("7"));

    expect(screen.getByRole("heading", { level: 1, name: "Kemi Adebayo" })).toBeInTheDocument();
    expect(screen.getByText("We miss WhatsApp orders at night.")).toBeInTheDocument();
    expect(screen.getByText("kemi@adebayopharmacy.ng")).toBeInTheDocument();
    expect(screen.getByText("Not given")).toBeInTheDocument();
    expect(screen.getByText("10 November 2028")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as contacted" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as closed" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as new again" })).not.toBeInTheDocument();
  });

  it("offers to reopen a closed lead, and confirms a change", async () => {
    api.getLead.mockResolvedValueOnce({ ok: true, data: { ...detail, status: "closed" } });

    render(await open("7", { done: "closed" }));

    expect(screen.getByRole("status")).toHaveTextContent("Marked as closed.");
    expect(screen.getByRole("button", { name: "Mark as new again" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as contacted" })).not.toBeInTheDocument();
  });

  it("shows not found for a lead that doesn't exist", async () => {
    api.getLead.mockResolvedValueOnce({ ok: false, error: { code: "NOT_FOUND", message: "" } });

    await expect(open("999")).rejects.toThrow("NOT_FOUND");
  });
});
