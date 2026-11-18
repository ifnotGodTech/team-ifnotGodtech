import { describe, expect, it } from "vitest";
import { SAMPLE_CATALOGUE } from "@/test/sampleCatalogue";
import { groupSchema, planGap, planSchema, plansList, removalNote, serviceSchema, siteTextSchema, slugOf } from "./content";

const plans = SAMPLE_CATALOGUE.plans;
const PLAN = { monthlyPrice: "40,000", monthlyChanges: "1", allowances: { everyday: "3" }, lines: ["Priority WhatsApp support"], recommended: true };
const errorsOf = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]));

describe("plan validation", () => {
  it.each([["40,000"], ["₦40,000"], [" 40000 "]])("reads %s as ₦40,000", (price) => {
    expect(planSchema.parse({ ...PLAN, monthlyPrice: price }).monthlyPrice).toBe(40_000);
  });

  it("refuses prices that aren't whole naira or are out of range, and limits that aren't counts", () => {
    expect(errorsOf(planSchema.safeParse({ ...PLAN, monthlyPrice: "40,000.50" }))).toEqual({ monthlyPrice: "Enter the price in whole naira, such as 40,000." });
    expect(errorsOf(planSchema.safeParse({ ...PLAN, monthlyPrice: "500" }))).toEqual({ monthlyPrice: "The price must be at least ₦1,000." });
    expect(errorsOf(planSchema.safeParse({ ...PLAN, monthlyChanges: "-1", allowances: { everyday: "99" } }))).toEqual({
      monthlyChanges: "Enter changes a month as a whole number.",
      "allowances.everyday": "Services from a group can be at most 50.",
    });
  });

  it("limits a plan's other lines", () => {
    expect(errorsOf(planSchema.safeParse({ ...PLAN, lines: Array(9).fill("A line") }))).toEqual({ lines: "A plan can list up to 8 other things." });
    expect(errorsOf(planSchema.safeParse({ ...PLAN, lines: ["x".repeat(81)] }))).toEqual({ "lines.0": "Keep each line to 80 characters or fewer." });
  });
});

describe("service, group and site text validation", () => {
  it("needs a name, a problem, a group and at least one plan", () => {
    expect(errorsOf(serviceSchema.safeParse({ id: null, name: " ", problem: "", group: "", plans: [] }))).toEqual({
      name: "Enter a name.",
      problem: "Enter the problem it solves.",
      group: "Choose a group.",
      plans: "Choose at least one plan.",
    });
  });

  it("doesn't let a service be offered on Custom by tick box", () => {
    expect(serviceSchema.safeParse({ id: null, name: "Report", problem: "I never know.", group: "everyday", plans: ["custom"] }).success).toBe(false);
  });

  it("needs a group's words for one and several, and sensible site text", () => {
    expect(Object.keys(errorsOf(groupSchema.safeParse({ id: null, name: "Websites", unitSingular: "", unitPlural: "" })))).toEqual(["unitSingular", "unitPlural"]);
    expect(Object.keys(errorsOf(siteTextSchema.safeParse({ headline: "Hi", introduction: "Short", closingCallToAction: "Go" })))).toEqual([
      "headline",
      "introduction",
      "closingCallToAction",
    ]);
  });
});

describe("warnings while editing a service", () => {
  it("warns when a lower plan includes a service but a higher one doesn't, naming the nearest plan below", () => {
    expect(planGap(plans, ["starter", "growth"])).toBe("Growth includes this service, but Pro doesn't. A client moving up to Pro would lose it. You can still save.");
    expect(planGap(plans, ["starter", "pro"])).toMatch(/^Starter includes this service, but Growth doesn't/);
    expect(planGap(plans, ["growth", "pro"])).toBeNull();
    expect(planGap(plans, ["pro"])).toBeNull();
  });

  it("explains what happens to clients on plans a service is taken off", () => {
    expect(removalNote(plans, ["starter", "growth", "pro"], ["pro"])).toBe(
      "Clients on Starter and Growth who already have it keep it until we let them know and move them on. New clients on those plans won't see it."
    );
    expect(removalNote(plans, ["growth"], ["growth", "pro"])).toBeNull();
  });

  it("names plans and makes ids", () => {
    expect(plansList(plans, ["starter", "growth", "pro"])).toBe("Starter, Growth and Pro");
    expect(plansList(plans, ["pro"])).toBe("Pro only");
    expect(slugOf("Websites & Apps!")).toBe("websites-apps");
  });
});
