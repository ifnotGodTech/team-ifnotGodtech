import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Overview } from "@/types/overview";

const mocks = vi.hoisted(() => ({ result: null as unknown }));
vi.mock("@/lib/auth", () => ({ requireStaff: async () => ({ staff: { email: "tunde@ifnotgod.com" }, expiresAt: 0 }) }));
vi.mock("@/lib/api/overview", () => ({ getOverview: async () => mocks.result }));

import OverviewPage from "./page";

const EMPTY: Overview = {
  activeSubscriptions: 0,
  monthlyIncome: 0,
  renewingSoon: [],
  cancelledStillRunning: 0,
  nextCancellationEnds: null,
  clientsWithoutPlan: 0,
  recentChanges: [],
};
const show = async (overview: Partial<Overview> | null) => {
  mocks.result = overview ? { ok: true, data: { ...EMPTY, ...overview } } : { ok: false, error: { code: "UNAVAILABLE", message: "The dashboard can't reach the server right now." } };
  render(await OverviewPage());
};

describe("overview page", () => {
  it("links each count to the list behind it", async () => {
    await show({ activeSubscriptions: 8, monthlyIncome: 360_000, cancelledStillRunning: 2, nextCancellationEnds: "2026-11-28", clientsWithoutPlan: 3 });

    const glance = screen.getByRole("region", { name: "At a glance" });
    expect(within(glance).getByRole("link", { name: /Active subscriptions\s*8\s*₦360,000 a month at plan prices/ })).toHaveAttribute("href", "/subscriptions?show=active");
    expect(within(glance).getByRole("link", { name: /Renewing in 7 days\s*0\s*None due/ })).toHaveAttribute("href", "/subscriptions?show=renewing");
    expect(within(glance).getByRole("link", { name: /Cancelled, still running\s*2\s*Next ends 28 Nov 2026/ })).toHaveAttribute("href", "/subscriptions?show=cancelled");
    expect(within(glance).getByRole("link", { name: /Clients without a plan\s*3/ })).toHaveAttribute("href", "/clients?plan=none");
  });

  it("shows upcoming renewals with their reminders, and recent changes", async () => {
    await show({
      renewingSoon: [
        { clientId: "c-ada", clientName: "Ada Obi", planName: "Growth", billingPeriod: "monthly", renewsOn: "2026-11-10", reminder: { dueOn: "2026-11-07", sentOn: "2026-11-07" } },
        { clientId: "c-grace", clientName: "Grace Okon", planName: "Pro", billingPeriod: "six-months", renewsOn: "2026-11-14", reminder: { dueOn: "2026-11-11", sentOn: null } },
      ],
      recentChanges: [{ id: "x", at: "2026-11-07T15:40:00Z", text: "Cancelled the subscription", by: "the client", clientId: "c-funmi", clientName: "Funmi Adeyemi" }],
    });

    expect(screen.getByRole("link", { name: /Renewing in 7 days\s*2\s*1 of 2 reminders sent/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Ada Obi/ })).toHaveTextContent("Growth, monthly10 NovSent 7 Nov");
    expect(screen.getByRole("row", { name: /Grace Okon/ })).toHaveTextContent("Pro, 6 months14 NovDue 11 Nov");
    expect(within(screen.getByRole("region", { name: "Recent changes" })).getByRole("listitem")).toHaveTextContent(
      "Funmi Adeyemi: Cancelled the subscription7 Nov 2026, 4:40 pm · by the client"
    );
  });

  it("shows a site content change, linking to Site content", async () => {
    await show({
      recentChanges: [{ id: "y", at: "2026-11-10T10:00:00Z", text: "Saved the Growth plan.", by: "tunde@ifnotgod.com", clientId: null, clientName: null }],
    });

    const change = within(screen.getByRole("region", { name: "Recent changes" })).getByRole("listitem");
    expect(change).toHaveTextContent("Site content: Saved the Growth plan.");
    expect(within(change).getByRole("link", { name: "Site content" })).toHaveAttribute("href", "/content");
  });

  it("explains empty lists", async () => {
    await show({});

    expect(screen.getByText("Nothing renews in the next 7 days.")).toBeInTheDocument();
    expect(screen.getByText("No changes yet.")).toBeInTheDocument();
    expect(screen.getByText("None running")).toBeInTheDocument();
  });

  it("says plainly when the backend can't be reached, with a way to retry", async () => {
    await show(null);

    expect(screen.getByText("The dashboard can't reach the server right now.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Find a client" })).toBeInTheDocument();
  });
});
