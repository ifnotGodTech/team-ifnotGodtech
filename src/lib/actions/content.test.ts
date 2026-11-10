import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signedIn: true,
  backend: { savePlan: vi.fn(), saveService: vi.fn(), setServiceShown: vi.fn(), saveGroup: vi.fn(), saveSiteText: vi.fn() },
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireStaff: async () => {
    if (!mocks.signedIn) mocks.redirect("/login");
    return { staff: { id: "s1", name: "Tunde", email: "tunde@ifnotgod.com" }, token: "t0ken", expiresAt: 0 };
  },
}));
vi.mock("@/lib/api/content", () => mocks.backend);

import { saveGroupAction, savePlanAction, saveServiceAction, saveSiteTextAction, setServiceShownAction } from "./content";
import { INITIAL_CONTENT_STATE } from "./formState";

const form = (fields: [string, string][]) => {
  const data = new FormData();
  fields.forEach(([key, value]) => data.append(key, value));
  return data;
};
const redirectedTo = (run: Promise<unknown>) => run.then(() => null, (error: Error) => error.message.replace("REDIRECT ", ""));
const OK = { ok: true, data: {} };
const PLAN_FORM: [string, string][] = [
  ["planId", "growth"],
  ["previousPrice", "40000"],
  ["monthlyPrice", "45,000"],
  ["monthlyChanges", "1"],
  ["allowance.everyday", "3"],
  ["allowance.agents", "1"],
  ["line", "Priority WhatsApp support"],
  ["line", "Monthly strategy call"],
  ["recommended", "on"],
];
const SERVICE_FORM: [string, string][] = [
  ["name", "Monthly sales report"],
  ["problem", "I never know how sales went."],
  ["group", "everyday"],
  ["plans", "growth"],
  ["plans", "pro"],
];

describe("site content actions", () => {
  beforeEach(() => {
    mocks.signedIn = true;
    Object.values(mocks.backend).forEach((fn) => fn.mockReset());
  });

  it.each([
    ["plan", () => savePlanAction(INITIAL_CONTENT_STATE, form(PLAN_FORM))],
    ["service", () => saveServiceAction(INITIAL_CONTENT_STATE, form(SERVICE_FORM))],
    ["shown", () => setServiceShownAction(form([["serviceId", "lead-follow-up"], ["shown", "false"]]))],
    ["group", () => saveGroupAction(INITIAL_CONTENT_STATE, form([["name", "Websites"]]))],
    ["text", () => saveSiteTextAction(INITIAL_CONTENT_STATE, form([["headline", "Hello there"]]))],
  ])("%s refuses signed-out callers", async (_, run) => {
    mocks.signedIn = false;

    expect(await redirectedTo(run())).toBe("/login");
    Object.values(mocks.backend).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });

  it("saves a plan from the form, and says when a new price applies", async () => {
    mocks.backend.savePlan.mockResolvedValueOnce(OK);

    const state = await savePlanAction(INITIAL_CONTENT_STATE, form(PLAN_FORM));

    expect(mocks.backend.savePlan).toHaveBeenCalledWith(
      "t0ken",
      "growth",
      { monthlyPrice: 45_000, monthlyChanges: 1, allowances: { everyday: 3, agents: 1 }, lines: ["Priority WhatsApp support", "Monthly strategy call"], recommended: true }
    );
    expect(state.notice).toBe(
      "Saved. It appears on the website within a few minutes. New subscribers pay ₦45,000 straight away, and existing subscribers from their next renewal."
    );
  });

  it("keeps the confirmation short when the price didn't change", async () => {
    mocks.backend.savePlan.mockResolvedValueOnce(OK);

    const state = await savePlanAction(INITIAL_CONTENT_STATE, form(PLAN_FORM.map(([key, value]) => [key, key === "monthlyPrice" ? "40,000" : value])));

    expect(state.notice).toBe("Saved. It appears on the website within a few minutes.");
  });

  it("shows field errors before calling the backend, and refuses Custom", async () => {
    const state = await savePlanAction(INITIAL_CONTENT_STATE, form(PLAN_FORM.map(([key, value]) => [key, key === "monthlyPrice" ? "cheap" : value])));

    expect(state).toMatchObject({ formError: "Check the highlighted fields.", fieldErrors: { monthlyPrice: "Enter the price in whole naira, such as 40,000." } });
    expect(await savePlanAction(INITIAL_CONTENT_STATE, form([["planId", "custom"]]))).toMatchObject({ formError: "That plan can't be edited here." });
    expect(mocks.backend.savePlan).not.toHaveBeenCalled();
  });

  it("shows the backend's reasons, and says when it can't be reached", async () => {
    mocks.backend.saveService.mockResolvedValueOnce({ ok: false, error: { code: "VALIDATION", message: "Check the highlighted fields.", fieldErrors: { name: "There's already a service called that." } } });
    mocks.backend.saveSiteText.mockRejectedValueOnce(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await saveServiceAction(INITIAL_CONTENT_STATE, form(SERVICE_FORM))).toMatchObject({ fieldErrors: { name: "There's already a service called that." } });
    const text = await saveSiteTextAction(INITIAL_CONTENT_STATE, form([["headline", "Every problem has a tech solution."], ["introduction", "We build and run AI automations for you."], ["closingCallToAction", "Talk to us today."]]));
    expect(text.formError).toBe("The dashboard can't reach the server right now. Please try again in a moment.");
  });

  it("adds or edits a service, then returns to the list with a confirmation", async () => {
    mocks.backend.saveService.mockResolvedValue(OK);

    expect(await redirectedTo(saveServiceAction(INITIAL_CONTENT_STATE, form(SERVICE_FORM)))).toBe("/content?tab=services&saved=new-service");
    expect(mocks.backend.saveService).toHaveBeenCalledWith("t0ken", { id: null, name: "Monthly sales report", problem: "I never know how sales went.", group: "everyday", plans: ["growth", "pro"] });
    expect(await redirectedTo(saveServiceAction(INITIAL_CONTENT_STATE, form([["id", "daily-brief"], ...SERVICE_FORM])))).toBe("/content?tab=services&saved=service");
  });

  it("hides or shows a service", async () => {
    mocks.backend.setServiceShown.mockResolvedValue(OK);

    expect(await redirectedTo(setServiceShownAction(form([["serviceId", "ai-call-agent"], ["shown", "false"]])))).toBe("/content?tab=services&saved=hidden");
    expect(mocks.backend.setServiceShown).toHaveBeenCalledWith("t0ken", "ai-call-agent", false);
    expect(await redirectedTo(setServiceShownAction(form([["serviceId", "ai-call-agent"], ["shown", "true"]])))).toBe("/content?tab=services&saved=shown");
  });

  it("adds a group, returning to the list, or renames one in place", async () => {
    mocks.backend.saveGroup.mockResolvedValue(OK);
    const fields: [string, string][] = [["name", "Websites and apps"], ["unitSingular", "website or app"], ["unitPlural", "websites or apps"]];

    expect(await redirectedTo(saveGroupAction(INITIAL_CONTENT_STATE, form(fields)))).toBe("/content?tab=groups&saved=new-group");
    expect(await saveGroupAction(INITIAL_CONTENT_STATE, form([["id", "agents"], ...fields]))).toMatchObject({ notice: "Saved. It appears on the website within a few minutes." });
  });
});
