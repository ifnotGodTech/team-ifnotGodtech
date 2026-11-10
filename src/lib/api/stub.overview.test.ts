import { describe, expect, it } from "vitest";
import { createStubBackend, RECENT_CHANGES_SHOWN } from "./stub";
import { memoryStubStore } from "./stubStore";

const NOW = Date.parse("2026-11-08T10:00:00Z");
const fresh = () => createStubBackend(() => NOW, memoryStubStore());
const overviewOf = async (backend = fresh()) => {
  const result = await backend.getOverview();
  if (!result.ok) throw new Error("Expected an overview");
  return result.data;
};

describe("stand-in overview", () => {
  it("counts active plans and what they bring in a month at plan prices", async () => {
    const overview = await overviewOf();

    expect(overview.activeSubscriptions).toBe(8);
    // 2 Starter, 4 Growth and 2 Pro.
    expect(overview.monthlyIncome).toBe(2 * 20_000 + 4 * 40_000 + 2 * 80_000);
  });

  it("lists renewals in the next 7 days, soonest first, with their reminders", async () => {
    const { renewingSoon } = await overviewOf();

    expect(renewingSoon.map((row) => row.clientName)).toEqual(["Ada Obi", "Tolu Bakare", "Chinedu Eze", "Grace Okon"]);
    expect(renewingSoon[0]).toMatchObject({ planName: "Growth", billingPeriod: "monthly", renewsOn: "2026-11-10", reminder: { sentOn: "2026-11-07" } });
    expect(renewingSoon[3].reminder).toMatchObject({ sentOn: null, dueOn: "2026-11-11" });
  });

  it("counts cancelled plans still running and clients without a plan", async () => {
    const overview = await overviewOf();

    expect(overview).toMatchObject({ cancelledStillRunning: 2, nextCancellationEnds: "2026-11-28", clientsWithoutPlan: 3 });
  });

  it("shows the latest changes across every client, newest first", async () => {
    const { recentChanges } = await overviewOf();

    expect(recentChanges).toHaveLength(RECENT_CHANGES_SHOWN);
    expect(recentChanges[0]).toMatchObject({ clientName: "Funmi Adeyemi", text: "Cancelled the subscription", by: "the client" });
    const times = recentChanges.map((change) => change.at);
    expect(times).toEqual([...times].sort().reverse());
  });
});
