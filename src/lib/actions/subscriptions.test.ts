import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signedIn: true,
  backend: { cancelSubscription: vi.fn(), keepSubscription: vi.fn(), updateServices: vi.fn(), changePlan: vi.fn() },
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({
  requireStaff: async () => {
    if (!mocks.signedIn) mocks.redirect("/login");
    return { staff: { id: "s1", name: "Tunde", email: "tunde@ifnotgod.com" }, expiresAt: 0 };
  },
}));
vi.mock("@/lib/api", () => ({ getBackend: () => mocks.backend }));

import { INITIAL_CHOICE_STATE } from "./formState";
import { cancelSubscriptionAction, changePlanAction, keepSubscriptionAction, updateServicesAction } from "./subscriptions";

const form = (fields: [string, string][]) => {
  const data = new FormData();
  fields.forEach(([key, value]) => data.append(key, value));
  return data;
};
const redirectedTo = (run: Promise<unknown>) => run.then(() => null, (error: Error) => error.message.replace("REDIRECT ", ""));
const OK = { ok: true, data: {} };
const REFUSED = { ok: false, error: { code: "VALIDATION", message: "That would use 1 change, but the client has none left this month." } };

describe("subscription actions", () => {
  beforeEach(() => {
    mocks.signedIn = true;
    Object.values(mocks.backend).forEach((fn) => fn.mockReset());
  });

  it.each([
    ["cancel", () => cancelSubscriptionAction(form([["clientId", "c-ada"]]))],
    ["keep", () => keepSubscriptionAction(form([["clientId", "c-ada"]]))],
    ["services", () => updateServicesAction(INITIAL_CHOICE_STATE, form([["clientId", "c-ada"]]))],
    ["plan", () => changePlanAction(INITIAL_CHOICE_STATE, form([["clientId", "c-ada"], ["plan", "pro"]]))],
  ])("%s refuses signed-out callers", async (_, run) => {
    mocks.signedIn = false;

    expect(await redirectedTo(run())).toBe("/login");
    Object.values(mocks.backend).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });

  it("refuses a malformed client id", async () => {
    expect(await redirectedTo(cancelSubscriptionAction(form([["clientId", "../admin"]])))).toBe("/clients");
    expect(mocks.backend.cancelSubscription).not.toHaveBeenCalled();
  });

  it("cancels and keeps a plan, saying who did it, then confirms", async () => {
    mocks.backend.cancelSubscription.mockResolvedValueOnce(OK);
    mocks.backend.keepSubscription.mockResolvedValueOnce(OK);

    expect(await redirectedTo(cancelSubscriptionAction(form([["clientId", "c-ada"]])))).toBe("/clients/c-ada?done=cancelled");
    expect(mocks.backend.cancelSubscription).toHaveBeenCalledWith("c-ada", "tunde@ifnotgod.com");
    expect(await redirectedTo(keepSubscriptionAction(form([["clientId", "c-ada"]])))).toBe("/clients/c-ada?done=kept");
  });

  it("says when cancelling or keeping fails, including a backend that can't be reached", async () => {
    mocks.backend.cancelSubscription.mockResolvedValueOnce({ ok: false, error: { code: "CONFLICT", message: "" } });
    mocks.backend.keepSubscription.mockRejectedValueOnce(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await redirectedTo(cancelSubscriptionAction(form([["clientId", "c-ada"]])))).toBe("/clients/c-ada?failed=cancel");
    expect(await redirectedTo(keepSubscriptionAction(form([["clientId", "c-ada"]])))).toBe("/clients/c-ada?failed=keep");
  });

  it("saves services and confirms", async () => {
    mocks.backend.updateServices.mockResolvedValueOnce(OK);
    const sent = form([["clientId", "c-ada"], ["services", "lead-follow-up"], ["services", "daily-brief"]]);

    expect(await redirectedTo(updateServicesAction(INITIAL_CHOICE_STATE, sent))).toBe("/clients/c-ada?done=services");
    expect(mocks.backend.updateServices).toHaveBeenCalledWith("c-ada", ["lead-follow-up", "daily-brief"], "tunde@ifnotgod.com");
  });

  it("shows the backend's reason when services can't be saved, keeping what was ticked", async () => {
    mocks.backend.updateServices.mockResolvedValueOnce(REFUSED);
    const sent = form([["clientId", "c-ada"], ["services", "lead-follow-up"]]);

    expect(await updateServicesAction(INITIAL_CHOICE_STATE, sent)).toEqual({ formError: REFUSED.error.message, values: ["lead-follow-up"] });
  });

  it("refuses malformed service ids before calling the backend", async () => {
    const state = await updateServicesAction(INITIAL_CHOICE_STATE, form([["clientId", "c-ada"], ["services", "<script>"]]));

    expect(state.formError).toBe("Some of those services aren't part of this plan.");
    expect(mocks.backend.updateServices).not.toHaveBeenCalled();
  });

  it("changes plan and confirms, refusing Custom and anything else", async () => {
    mocks.backend.changePlan.mockResolvedValueOnce(OK);

    expect(await redirectedTo(changePlanAction(INITIAL_CHOICE_STATE, form([["clientId", "c-ada"], ["plan", "pro"]])))).toBe("/clients/c-ada?done=plan");
    expect(await changePlanAction(INITIAL_CHOICE_STATE, form([["clientId", "c-ada"], ["plan", "custom"]]))).toEqual({ formError: "Choose a plan.", values: [] });
    expect(mocks.backend.changePlan).toHaveBeenCalledTimes(1);
  });

  it("explains a backend that can't be reached when changing plan, keeping the choice", async () => {
    mocks.backend.changePlan.mockRejectedValueOnce(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await changePlanAction(INITIAL_CHOICE_STATE, form([["clientId", "c-ada"], ["plan", "pro"]]))).toEqual({
      formError: "The dashboard can't reach the server right now. Please try again in a moment.",
      values: ["pro"],
    });
  });
});
