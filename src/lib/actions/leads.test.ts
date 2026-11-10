import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signedIn: true,
  setLeadStatus: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({
  requireStaff: async () => {
    if (!mocks.signedIn) mocks.redirect("/login");
    return { staff: { email: "tunde@ifnotgod.com" }, token: "t0ken", expiresAt: 0 };
  },
}));
vi.mock("@/lib/api/leads", () => ({ setLeadStatus: mocks.setLeadStatus }));

import { setLeadStatusAction } from "./leads";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.append(key, value));
  return data;
};
const redirectedTo = (run: Promise<unknown>) => run.then(() => null, (error: Error) => error.message.replace("REDIRECT ", ""));

describe("setLeadStatusAction", () => {
  beforeEach(() => {
    mocks.signedIn = true;
    mocks.setLeadStatus.mockReset();
  });

  it("refuses signed-out callers", async () => {
    mocks.signedIn = false;

    expect(await redirectedTo(setLeadStatusAction(form({ leadId: "7", status: "contacted" })))).toBe("/login");
    expect(mocks.setLeadStatus).not.toHaveBeenCalled();
  });

  it("saves the status and confirms it", async () => {
    mocks.setLeadStatus.mockResolvedValueOnce({ ok: true, data: {} });

    expect(await redirectedTo(setLeadStatusAction(form({ leadId: "7", status: "contacted" })))).toBe("/leads/7?done=contacted");
    expect(mocks.setLeadStatus).toHaveBeenCalledWith("t0ken", "7", "contacted");
  });

  it("refuses a malformed id or status before calling the backend", async () => {
    expect(await redirectedTo(setLeadStatusAction(form({ leadId: "../x", status: "closed" })))).toBe("/leads");
    expect(await redirectedTo(setLeadStatusAction(form({ leadId: "7", status: "won" })))).toBe("/leads/7");
    expect(mocks.setLeadStatus).not.toHaveBeenCalled();
  });

  it("says when it couldn't be saved, including a backend that can't be reached", async () => {
    mocks.setLeadStatus.mockResolvedValueOnce({ ok: false, error: { code: "UNAVAILABLE" } }).mockRejectedValueOnce(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await redirectedTo(setLeadStatusAction(form({ leadId: "7", status: "closed" })))).toBe("/leads/7?failed=status");
    expect(await redirectedTo(setLeadStatusAction(form({ leadId: "7", status: "closed" })))).toBe("/leads/7?failed=status");
  });
});
