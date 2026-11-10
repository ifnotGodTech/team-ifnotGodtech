import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClient, searchClients, sendPasswordReset } from "./clients";
import { cancelSubscription, changePlan, getSubscription, listSubscriptions, updateServices } from "./subscriptions";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const fetchMock = vi.fn();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const sent = (n = 0) => {
  const [url, options] = fetchMock.mock.calls[n];
  return { url, method: options.method, headers: options.headers, body: options.body ? JSON.parse(options.body) : undefined };
};
const summary = { id: "2", fullName: "Ada Obi", businessName: null, email: "ada@obilogistics.com", planName: "Growth", planStatus: "active", joinedOn: "2026-10-08" };
const subscription = {
  planId: "growth",
  billingPeriod: "monthly",
  status: "active",
  currentPeriodEnd: "2026-11-12",
  reminder: { dueOn: "2026-11-09", sentOn: null },
  changesLeftThisMonth: 1,
  setupFeePaidOn: null,
  serviceIds: [],
  pendingPlanId: null,
  payments: [],
  paymentDue: null,
};

describe("clients and subscriptions API", () => {
  beforeEach(() => {
    vi.stubEnv("DASHBOARD_API_URL", "https://api.example.com");
    vi.stubEnv("DASHBOARD_APP_KEY", "dashboard-key");
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("searches clients a page at a time, with the staff member's token", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { items: [summary], total: 1, page: 2, pageSize: 10 }));

    const result = await searchClients("t0ken", { query: "ada obi", page: 2, withoutPlan: true });

    expect(result).toMatchObject({ ok: true, data: { total: 1, items: [{ fullName: "Ada Obi", businessName: undefined }] } });
    expect(sent()).toMatchObject({
      url: "https://api.example.com/api/v1/staff/clients/?page=2&pageSize=10&q=ada+obi&withoutPlan=true",
      headers: { authorization: "Bearer t0ken" },
    });
  });

  it("reads one client and sends a password reset", async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { ...summary, signInMethod: "password", history: [{ id: "1", at: "2026-10-08T09:00:00Z", text: "Signed up", by: "the client" }] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    expect(await getClient("t0ken", "2")).toMatchObject({ ok: true, data: { signInMethod: "password", history: [{ text: "Signed up" }] } });
    expect(await sendPasswordReset("t0ken", "2")).toEqual({ ok: true, data: null });
    expect(sent(1)).toMatchObject({ url: "https://api.example.com/api/v1/staff/clients/2/password-reset/", method: "POST" });
  });

  it("treats an id that can't be a client as not found, without calling the backend", async () => {
    expect(await getClient("t0ken", "../admin")).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await getSubscription("t0ken", "c-ada")).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists subscriptions with their counts, asking for the whole list", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { items: [], total: 0, page: 1, pageSize: 100, counts: { all: 0, active: 0, renewing: 0, cancelled: 0 } }));

    expect(await listSubscriptions("t0ken", "renewing")).toMatchObject({ ok: true, data: { items: [], counts: { renewing: 0 } } });
    expect(sent().url).toBe("https://api.example.com/api/v1/staff/subscriptions/?filter=renewing&pageSize=100");
  });

  it("reads a client's plan, or none", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { subscription })).mockResolvedValueOnce(json(200, { subscription: null }));

    expect(await getSubscription("t0ken", "2")).toMatchObject({ ok: true, data: { planId: "growth" } });
    expect(await getSubscription("t0ken", "3")).toEqual({ ok: true, data: null });
  });

  it("makes changes on a client's behalf, passing on the backend's reasons", async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { subscription }))
      .mockResolvedValueOnce(json(200, { subscription }))
      .mockResolvedValueOnce(json(409, { code: "CONFLICT", message: "That's 1 swap, and only 0 are left this month.", errors: {}, detailCode: "NO_CHANGES_LEFT" }));

    await cancelSubscription("t0ken", "2");
    await changePlan("t0ken", "2", "pro");
    const refused = await updateServices("t0ken", "2", ["lead-follow-up"]);

    expect(sent(0)).toMatchObject({ url: "https://api.example.com/api/v1/staff/clients/2/subscription/cancel/", method: "POST" });
    expect(sent(1)).toMatchObject({ body: { planId: "pro" } });
    expect(sent(2)).toMatchObject({ method: "PUT", body: { serviceIds: ["lead-follow-up"] } });
    expect(refused).toMatchObject({ ok: false, error: { code: "CONFLICT", message: "That's 1 swap, and only 0 are left this month.", detailCode: "NO_CHANGES_LEFT" } });
  });
});
