import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCatalogue, savePlan, saveService, setServiceShown, saveGroup, saveSiteText } from "./content";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const fetchMock = vi.fn();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const sent = (n = 0) => {
  const [url, options] = fetchMock.mock.calls[n];
  return { url, method: options.method, headers: options.headers, body: options.body ? JSON.parse(options.body) : undefined };
};
const plan = { id: "growth", name: "Growth", monthlyPrice: 45000, monthlyChanges: 1, allowances: { everyday: 3, agents: "agreed" }, lines: ["Landing page"], recommended: true, tag: "extra fields are ignored" };
const service = { id: "monthly-sales-report", group: "everyday", name: "Monthly sales report", problem: "I never know how sales went.", plans: ["growth", "pro", "custom"], available: true, catchAll: false };
const group = { id: "websites", name: "Websites", unitSingular: "website", unitPlural: "websites" };

describe("site content API", () => {
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

  it("reads the whole catalogue, listing only priced plans on each service", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { plans: [plan], groups: [group], services: [service], billingTerms: {} }));

    const result = await getCatalogue("t0ken");

    expect(result).toMatchObject({ ok: true, data: { plans: [{ id: "growth", allowances: { agents: "agreed" } }], services: [{ plans: ["growth", "pro"] }] } });
    expect(sent()).toMatchObject({ url: "https://api.example.com/api/v1/staff/catalogue/", headers: { authorization: "Bearer t0ken" } });
  });

  it("saves a plan, a new or existing service, its visibility, a group and the site text", async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, plan))
      .mockResolvedValueOnce(json(201, service))
      .mockResolvedValueOnce(json(200, service))
      .mockResolvedValueOnce(json(200, { ...service, available: false }))
      .mockResolvedValueOnce(json(201, group))
      .mockResolvedValueOnce(json(200, { headline: "h", introduction: "i", closingCallToAction: "c" }));
    const update = { monthlyPrice: 45000, monthlyChanges: 1, allowances: { everyday: 3 }, lines: ["Landing page"], recommended: true };
    const draft = { id: null, name: "Monthly sales report", problem: "I never know how sales went.", group: "everyday", plans: ["growth" as const] };

    await savePlan("t0ken", "growth", update);
    await saveService("t0ken", draft);
    await saveService("t0ken", { ...draft, id: "monthly-sales-report" });
    await setServiceShown("t0ken", "monthly-sales-report", false);
    await saveGroup("t0ken", { id: null, name: "Websites", unitSingular: "website", unitPlural: "websites" });
    await saveSiteText("t0ken", { headline: "h", introduction: "i", closingCallToAction: "c" });

    expect(sent(0)).toMatchObject({ url: "https://api.example.com/api/v1/staff/catalogue/plans/growth/", method: "PUT", body: update });
    expect(sent(1)).toMatchObject({ url: "https://api.example.com/api/v1/staff/catalogue/services/", method: "POST", body: { name: "Monthly sales report", plans: ["growth"] } });
    expect(sent(2)).toMatchObject({ url: "https://api.example.com/api/v1/staff/catalogue/services/monthly-sales-report/", method: "PUT" });
    expect(sent(3)).toMatchObject({ url: "https://api.example.com/api/v1/staff/catalogue/services/monthly-sales-report/shown/", body: { shown: false } });
    expect(sent(4)).toMatchObject({ url: "https://api.example.com/api/v1/staff/catalogue/groups/", method: "POST" });
    expect(sent(5)).toMatchObject({ url: "https://api.example.com/api/v1/staff/site-text/", method: "PUT" });
  });

  it("passes on a refused field, such as a name that's taken", async () => {
    fetchMock.mockResolvedValueOnce(json(400, { code: "VALIDATION", message: "Check the highlighted fields.", errors: { name: ["There's already a service called Lead follow-up."] } }));

    expect(await saveService("t0ken", { id: null, name: "Lead follow-up", problem: "x x x x x", group: "everyday", plans: ["growth"] })).toMatchObject({
      ok: false,
      error: { code: "VALIDATION", fieldErrors: { name: "There's already a service called Lead follow-up." } },
    });
  });
});
