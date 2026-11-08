import { describe, expect, it } from "vitest";
import { createStubBackend } from "./stub";
import { memoryStubStore } from "./stubStore";

const NOW = Date.parse("2026-11-08T10:00:00Z");
const STAFF = "tunde@ifnotgod.com";
const DAYS_5 = 5 * 24 * 60 * 60 * 1000;
const fresh = (now = NOW) => createStubBackend(() => now, memoryStubStore());
const data = <T>(result: { ok: boolean; data?: T }) => {
  if (!result.ok) throw new Error(`Expected success: ${JSON.stringify(result)}`);
  return result.data as T;
};

describe("stand-in subscriptions list", () => {
  it("counts each filter and lists soonest first", async () => {
    const list = data(await fresh().listSubscriptions("all"));

    expect(list.counts).toEqual({ all: 10, active: 8, renewing: 4, cancelled: 2 });
    const dates = list.items.map((row) => row.currentPeriodEnd);
    expect(dates).toEqual([...dates].sort());
    expect(list.items[0]).toMatchObject({ clientName: "Ada Obi", planName: "Growth", status: "active", currentPeriodEnd: "2026-11-10", servicesChosen: 6, servicesIncluded: 6 });
  });

  it("filters to plans renewing within 7 days, and cancelled plans still running", async () => {
    const backend = fresh();

    expect(data(await backend.listSubscriptions("renewing")).items.map((row) => row.clientName)).toEqual(["Ada Obi", "Tolu Bakare", "Chinedu Eze", "Grace Okon"]);
    expect(data(await backend.listSubscriptions("cancelled")).items.map((row) => row.clientName)).toEqual(["Kunle Ade", "Funmi Adeyemi"]);
  });

  it("shows a waiting plan change", async () => {
    const ifeoma = data(await fresh().listSubscriptions("all")).items.find((row) => row.clientId === "c-ifeoma");

    expect(ifeoma).toMatchObject({ planName: "Growth", pendingPlanName: "Pro", billingPeriod: "twelve-months" });
  });

  it("drops a cancelled plan from the list once its paid period is over", async () => {
    const store = memoryStubStore();
    await createStubBackend(() => NOW, store).cancelSubscription("c-ada", STAFF);
    const later = createStubBackend(() => NOW + DAYS_5, store);

    expect(data(await later.listSubscriptions("all")).items.map((row) => row.clientId)).not.toContain("c-ada");
    expect(data(await later.getSubscription("c-ada"))?.status).toBe("ended");
    expect(data(await later.getClient("c-ada"))).toMatchObject({ planName: null, planStatus: "none" });
    expect(await later.keepSubscription("c-ada", STAFF)).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });
});

describe("stand-in subscription details", () => {
  it("returns nothing for a client without a plan, and not found for an unknown client", async () => {
    expect(await fresh().getSubscription("c-musa")).toEqual({ ok: true, data: null });
    expect(await fresh().getSubscription("nope")).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("charges the setup fee with the first monthly payment, and waives it for paying upfront", async () => {
    const ada = data(await fresh().getSubscription("c-ada"))!;
    const grace = data(await fresh().getSubscription("c-grace"))!;

    expect(ada.payments.at(-1)).toMatchObject({ description: "Growth, monthly, and setup fee", amount: 140_000 });
    expect(ada.setupFeePaidOn).toBe(ada.payments.at(-1)!.paidOn);
    expect(grace.setupFeePaidOn).toBeNull();
    expect(grace.payments[0]).toMatchObject({ description: "Pro, 6 months", amount: 480_000 });
  });

  it("emails a reminder a few days before renewal", async () => {
    expect(data(await fresh().getSubscription("c-ada"))!.reminder).toEqual({ dueOn: "2026-11-07", sentOn: "2026-11-07" });
    expect(data(await fresh().getSubscription("c-bisi"))!.reminder).toEqual({ dueOn: "2026-11-16", sentOn: null });
    expect(data(await fresh().getSubscription("c-funmi"))!.reminder).toBeNull();
  });

  it("records when the client subscribed, from their first payment", async () => {
    const history = data(await fresh().getClient("c-grace")).history;

    expect(history.find((entry) => entry.id === "c-grace-subscribed")?.text).toBe("Subscribed to Pro, 6 months upfront");
  });
});

describe("changes on a client's behalf", () => {
  it("cancels, keeping everything working to the end of the paid period, and records who did it", async () => {
    const backend = fresh();
    const cancelled = data(await backend.cancelSubscription("c-ifeoma", STAFF));

    expect(cancelled).toMatchObject({ status: "cancelled", currentPeriodEnd: "2027-08-21", pendingPlanId: null, reminder: null });
    expect(data(await backend.getClient("c-ifeoma"))).toMatchObject({ planStatus: "cancelled" });
    expect(data(await backend.getClient("c-ifeoma")).history[0]).toMatchObject({ text: "Cancelled the subscription", by: STAFF });
    expect(await backend.cancelSubscription("c-ifeoma", STAFF)).toMatchObject({ ok: false, error: { code: "CONFLICT", message: "This plan is already cancelled." } });
  });

  it("keeps a cancelled plan while it's still running", async () => {
    const backend = fresh();

    expect(data(await backend.keepSubscription("c-funmi", STAFF))).toMatchObject({ status: "active", reminder: { dueOn: "2026-11-30" } });
    expect(data(await backend.getClient("c-funmi")).history[0].text).toBe("Kept the plan after it was cancelled");
    expect(await backend.keepSubscription("c-ada", STAFF)).toMatchObject({ ok: false, error: { message: "This plan isn't cancelled." } });
  });

  it("swaps services using one of the month's changes", async () => {
    const backend = fresh();
    const before = data(await backend.getSubscription("c-chinedu"))!;
    const after = data(await backend.updateServices("c-chinedu", ["lead-follow-up", "scheduling-posting"], STAFF));

    expect(before.changesLeftThisMonth).toBe(1);
    expect(after).toMatchObject({ serviceIds: ["lead-follow-up", "scheduling-posting"], changesLeftThisMonth: 0 });
    expect(data(await backend.getClient("c-chinedu")).history[0]).toMatchObject({ text: "Swapped Payment reminders and receipts for Lead follow-up", by: STAFF });
  });

  it("explains a swap with no changes left, too many services, or nothing changed", async () => {
    const backend = fresh();
    const ada = data(await backend.getSubscription("c-ada"))!.serviceIds;

    expect(await backend.updateServices("c-ada", [...ada.slice(1), "payment-reminders"], STAFF)).toMatchObject({
      ok: false,
      error: { code: "VALIDATION", message: "That would use 1 change, but the client has none left this month." },
    });
    expect(await backend.updateServices("c-chinedu", ["lead-follow-up", "payment-reminders", "scheduling-posting"], STAFF)).toMatchObject({
      error: { message: "The Starter plan includes 1 everyday automation. Choose fewer." },
    });
    expect(await backend.updateServices("c-ada", ada, STAFF)).toMatchObject({ error: { message: "Nothing has changed." } });
  });

  it("lets services be chosen for the first time without using a change", async () => {
    const backend = fresh();
    await backend.keepSubscription("c-kunle", STAFF);

    expect(data(await backend.updateServices("c-kunle", ["lead-follow-up"], STAFF))).toMatchObject({ changesLeftThisMonth: 1 });
    expect(data(await backend.getClient("c-kunle")).history[0].text).toBe("Chose services: Lead follow-up");
  });

  it("changes plan from the next renewal, and drops a waiting change by choosing the current plan", async () => {
    const backend = fresh();

    expect(data(await backend.changePlan("c-ada", "pro", STAFF))).toMatchObject({ planId: "growth", pendingPlanId: "pro" });
    expect(data(await backend.getClient("c-ada")).history[0].text).toBe("Plan changes to Pro at the next renewal");
    expect(data(await backend.changePlan("c-ada", "growth", STAFF))).toMatchObject({ pendingPlanId: null });
    expect(data(await backend.getClient("c-ada")).history[0].text).toBe("Cancelled the waiting plan change");
  });

  it("refuses plan and service changes on a cancelled plan, Custom, and clients without a plan", async () => {
    const backend = fresh();

    expect(await backend.changePlan("c-funmi", "starter", STAFF)).toMatchObject({ error: { code: "CONFLICT" } });
    expect(await backend.updateServices("c-funmi", [], STAFF)).toMatchObject({ error: { code: "CONFLICT" } });
    expect(await backend.changePlan("c-ada", "custom", STAFF)).toMatchObject({ error: { code: "VALIDATION" } });
    expect(await backend.cancelSubscription("c-musa", STAFF)).toMatchObject({ error: { message: "This client doesn't have a plan." } });
    expect(await backend.cancelSubscription("nope", STAFF)).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});
