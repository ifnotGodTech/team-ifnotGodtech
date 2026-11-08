import { describe, expect, it } from "vitest";
import { STUB_CATALOGUE } from "@/lib/api/stubCatalogue";
import { allowanceLabel, checkServiceSelection, isSubscriptionFilter, paidLabel, pricedPlans, serviceChoices, servicesIncluded } from "./subscriptions";

const plan = (id: string) => STUB_CATALOGUE.plans.find((item) => item.id === id)!;
const growth = serviceChoices(plan("growth"), STUB_CATALOGUE);
const GROWTH_SIX = ["lead-follow-up", "appointment-booking", "daily-brief", "scheduling-posting", "performance-report", "whatsapp-sales-agent"];

describe("service choices", () => {
  it("offers each group the plan includes, with services from that plan or lower", () => {
    const starter = serviceChoices(plan("starter"), STUB_CATALOGUE);

    expect(starter.map((choice) => choice.label)).toEqual(["1 everyday automation", "1 social or content service"]);
    expect(starter[1].services.map((service) => service.id)).not.toContain("dm-assistant");
    expect(growth.find((choice) => choice.group.id === "agents")?.services.map((service) => service.id)).toEqual(["whatsapp-sales-agent", "staff-assistant"]);
  });

  it("keeps a service taken off the website for a client who already has it, and hides it from others", () => {
    const catalogue = structuredClone(STUB_CATALOGUE);
    catalogue.services.find((service) => service.id === "daily-brief")!.available = false;
    const ids = (current: string[]) => serviceChoices(plan("growth"), catalogue, current).flatMap((choice) => choice.services.map((service) => service.id));

    expect(ids([])).not.toContain("daily-brief");
    expect(ids(["daily-brief"])).toContain("daily-brief");
  });

  it("counts what each plan includes", () => {
    expect(STUB_CATALOGUE.plans.map(servicesIncluded)).toEqual([2, 6, 12, null]);
    expect(pricedPlans(STUB_CATALOGUE).map((item) => item.id)).toEqual(["starter", "growth", "pro"]);
    expect(allowanceLabel(STUB_CATALOGUE.groups[2], "agreed")).toBe("AI agents");
  });
});

describe("checking a new set of services", () => {
  it("lets services be chosen for the first time without using a change", () => {
    expect(checkServiceSelection(growth, [], GROWTH_SIX, 0)).toEqual({ ok: true, changesUsed: 0 });
  });

  it("uses one change for each service added in place of another", () => {
    const swapped = [...GROWTH_SIX.slice(1), "payment-reminders"];

    expect(checkServiceSelection(growth, GROWTH_SIX, swapped, 1)).toEqual({ ok: true, changesUsed: 1 });
    expect(checkServiceSelection(growth, GROWTH_SIX, GROWTH_SIX.slice(1), 0)).toEqual({ ok: true, changesUsed: 0 });
  });

  it("refuses more changes than are left this month", () => {
    const twoSwaps = [...GROWTH_SIX.slice(2), "payment-reminders", "brand-deal-inbox"];

    expect(checkServiceSelection(growth, GROWTH_SIX, twoSwaps, 1)).toEqual({ ok: false, reason: "no-changes-left", changesUsed: 2 });
  });

  it("refuses more services than a group includes, duplicates, and services outside the plan", () => {
    expect(checkServiceSelection(growth, [], [...GROWTH_SIX, "payment-reminders"], 1)).toMatchObject({ ok: false, reason: "too-many", allowance: 3 });
    expect(checkServiceSelection(growth, [], ["lead-follow-up", "lead-follow-up"], 1)).toMatchObject({ ok: false, reason: "duplicate" });
    expect(checkServiceSelection(growth, [], ["ai-call-agent"], 1)).toMatchObject({ ok: false, reason: "not-offered" });
  });
});

describe("labels", () => {
  it("names how a plan is paid, and knows the list filters", () => {
    expect(paidLabel("six-months")).toBe("paid 6 months upfront");
    expect(isSubscriptionFilter("renewing")).toBe(true);
    expect(isSubscriptionFilter("everything")).toBe(false);
  });
});
