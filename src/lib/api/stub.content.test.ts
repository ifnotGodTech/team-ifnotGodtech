import { describe, expect, it } from "vitest";
import { serviceChoices } from "@/shared/subscriptions";
import { createStubBackend } from "./stub";
import { STUB_SITE_TEXT } from "./stubCatalogue";
import { memoryStubStore } from "./stubStore";

const STAFF = "tunde@ifnotgod.com";
const fresh = () => createStubBackend(() => Date.parse("2026-11-08T10:00:00Z"), memoryStubStore());
const catalogueOf = async (backend: ReturnType<typeof fresh>) => {
  const result = await backend.getCatalogue();
  if (!result.ok) throw new Error("Expected a catalogue");
  return result.data;
};
const UPDATE = { monthlyPrice: 45_000, monthlyChanges: 2, allowances: { everyday: 3, social: 2, agents: 1 }, lines: ["Priority WhatsApp support", "Monthly strategy call"], recommended: true };
const NEW_SERVICE = { id: null, name: "Monthly sales report", problem: "I never know how sales went.", group: "everyday", plans: ["growth", "pro"] as ("growth" | "pro")[] };

describe("stand-in plans", () => {
  it("saves a plan's price, limits and lines", async () => {
    const backend = fresh();
    expect(await backend.savePlan("growth", UPDATE, STAFF)).toMatchObject({ ok: true, data: { monthlyPrice: 45_000, lines: UPDATE.lines } });
    expect((await catalogueOf(backend)).plans[1]).toMatchObject({ monthlyPrice: 45_000, monthlyChanges: 2 });
  });

  it("keeps only one plan recommended", async () => {
    const backend = fresh();
    await backend.savePlan("pro", { ...UPDATE, monthlyPrice: 80_000 }, STAFF);

    expect((await catalogueOf(backend)).plans.filter((plan) => plan.recommended).map((plan) => plan.id)).toEqual(["pro"]);
  });

  it("refuses Custom, prices out of range, and groups that don't exist", async () => {
    const backend = fresh();

    expect(await backend.savePlan("custom", UPDATE, STAFF)).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(await backend.savePlan("growth", { ...UPDATE, monthlyPrice: 10 }, STAFF)).toMatchObject({
      ok: false,
      error: { code: "VALIDATION", fieldErrors: { monthlyPrice: "The price must be at least ₦1,000." } },
    });
    expect(await backend.savePlan("growth", { ...UPDATE, allowances: { gone: 1 } }, STAFF)).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
  });
});

describe("stand-in services", () => {
  it("adds a service with an id from its name, shown on the site", async () => {
    const backend = fresh();
    const added = await backend.saveService(NEW_SERVICE, STAFF);

    expect(added).toMatchObject({ ok: true, data: { id: "monthly-sales-report", available: true, plans: ["growth", "pro"] } });
    expect((await catalogueOf(backend)).services.at(-1)?.name).toBe("Monthly sales report");
  });

  it("refuses a second service with the same name", async () => {
    const backend = fresh();

    expect(await backend.saveService({ ...NEW_SERVICE, name: "lead follow-up" }, STAFF)).toMatchObject({
      ok: false,
      error: { fieldErrors: { name: "There's already a service called Lead follow-up." } },
    });
  });

  it("edits which plans include a service, keeping whether it's shown", async () => {
    const backend = fresh();
    await backend.setServiceShown("daily-brief", false, STAFF);
    const saved = await backend.saveService({ ...NEW_SERVICE, id: "daily-brief", name: "Daily business brief", plans: ["pro"] }, STAFF);

    expect(saved).toMatchObject({ ok: true, data: { id: "daily-brief", plans: ["pro"], available: false } });
  });

  it("offers a new service to clients on its plans, and keeps a removed one for clients who have it", async () => {
    const backend = fresh();
    await backend.saveService(NEW_SERVICE, STAFF);
    await backend.saveService({ ...NEW_SERVICE, id: "daily-brief", name: "Daily business brief", plans: ["pro"] }, STAFF);
    const catalogue = await catalogueOf(backend);
    const growth = catalogue.plans[1];
    const ids = (current: string[]) => serviceChoices(growth, catalogue, current).flatMap((choice) => choice.services.map((service) => service.id));

    expect(ids([])).toContain("monthly-sales-report");
    expect(ids([])).not.toContain("daily-brief");
    expect(ids(["daily-brief"])).toContain("daily-brief");
  });

  it("hides and shows a service", async () => {
    const backend = fresh();

    expect(await backend.setServiceShown("ai-call-agent", false, STAFF)).toMatchObject({ ok: true, data: { available: false } });
    expect(await backend.setServiceShown("ai-call-agent", true, STAFF)).toMatchObject({ ok: true, data: { available: true } });
    expect(await backend.setServiceShown("nope", true, STAFF)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

describe("stand-in groups and site text", () => {
  it("adds a group that plans include none of until they're saved", async () => {
    const backend = fresh();
    const added = await backend.saveGroup({ id: null, name: "Websites and apps", unitSingular: "website or app", unitPlural: "websites or apps" }, STAFF);
    const catalogue = await catalogueOf(backend);

    expect(added).toMatchObject({ ok: true, data: { id: "websites-and-apps" } });
    expect(catalogue.groups.map((group) => group.id)).toContain("websites-and-apps");
    expect(catalogue.plans[1].allowances["websites-and-apps"]).toBeUndefined();
    expect(await backend.savePlan("growth", { ...UPDATE, allowances: { ...UPDATE.allowances, "websites-and-apps": 1 } }, STAFF)).toMatchObject({ ok: true });
  });

  it("renames a group, refusing a name already used", async () => {
    const backend = fresh();

    expect(await backend.saveGroup({ id: "agents", name: "AI helpers", unitSingular: "AI helper", unitPlural: "AI helpers" }, STAFF)).toMatchObject({ ok: true });
    expect(await backend.saveGroup({ id: "social", name: "ai helpers", unitSingular: "x x", unitPlural: "x x" }, STAFF)).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
  });

  it("reads and saves the site text", async () => {
    const backend = fresh();
    const text = { ...STUB_SITE_TEXT, headline: "Every problem has a tech solution." };

    expect(await backend.getSiteText()).toEqual({ ok: true, data: STUB_SITE_TEXT });
    expect(await backend.saveSiteText(text, STAFF)).toEqual({ ok: true, data: text });
    expect(await backend.getSiteText()).toEqual({ ok: true, data: text });
    expect(await backend.saveSiteText({ ...text, headline: "" }, STAFF)).toMatchObject({ ok: false, error: { fieldErrors: { headline: "Enter a headline." } } });
  });
});
