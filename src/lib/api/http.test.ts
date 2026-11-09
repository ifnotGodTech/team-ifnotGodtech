import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiRequest } from "./http";

const requestHeaders = vi.hoisted(() => ({ value: new Headers() }));
vi.mock("next/headers", () => ({ headers: async () => requestHeaders.value }));

const schema = z.object({ name: z.string() });
const fetchMock = vi.fn();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("apiRequest", () => {
  beforeEach(() => {
    vi.stubEnv("DASHBOARD_API_URL", "https://api.example.com/");
    vi.stubEnv("DASHBOARD_APP_KEY", "dashboard-key");
    requestHeaders.value = new Headers();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns checked data on success", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { name: "Ada" }));

    expect(await apiRequest("/clients/1", { schema })).toEqual({ ok: true, data: { name: "Ada" } });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.com/api/v1/clients/1");
    expect(options).toMatchObject({ method: "GET", cache: "no-store" });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("sends the dashboard's app key and the visitor's own address", async () => {
    requestHeaders.value = new Headers({ "x-forwarded-for": "102.89.1.10, 76.76.21.1" });
    fetchMock.mockResolvedValueOnce(json(200, { name: "Ada" }));

    await apiRequest("/clients/1", { schema });

    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ "x-app-key": "dashboard-key", "x-visitor-ip": "102.89.1.10" });
  });

  it("leaves out the visitor's address when there isn't one", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { name: "Ada" }));

    await apiRequest("/clients/1", { schema });

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("x-visitor-ip");
  });

  it("refuses to call the backend without the app key", async () => {
    vi.stubEnv("DASHBOARD_APP_KEY", "");

    expect(await apiRequest("/clients/1", { schema })).toMatchObject({ ok: false, error: { code: "UNAVAILABLE" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a JSON body and extra headers", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { name: "Ada" }));

    await apiRequest("/clients", { method: "POST", body: { name: "Ada" }, schema, headers: { cookie: "session=1" } });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.body).toBe('{"name":"Ada"}');
    expect(options.headers).toMatchObject({ "content-type": "application/json", cookie: "session=1" });
  });

  it("refuses a response with an unexpected shape", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { name: 42 }));

    expect(await apiRequest("/clients/1", { schema })).toMatchObject({ ok: false, error: { code: "UNEXPECTED" } });
  });

  it("passes on the backend's validation messages", async () => {
    fetchMock.mockResolvedValueOnce(json(422, { message: "Check the price.", errors: { price: ["Must be a whole number."] } }));

    expect(await apiRequest("/plans/1", { method: "PATCH", schema })).toEqual({
      ok: false,
      error: { code: "VALIDATION", status: 422, message: "Check the price.", fieldErrors: { price: "Must be a whole number." } },
    });
  });

  it("passes on the backend's limit messages and detail codes", async () => {
    fetchMock.mockResolvedValueOnce(json(429, { message: "Too many wrong codes. Please log in again.", detailCode: "TOO_MANY_CODES" }));

    expect(await apiRequest("/staff/log-in/code/", { method: "POST", schema })).toMatchObject({
      ok: false,
      error: { code: "RATE_LIMITED", message: "Too many wrong codes. Please log in again.", detailCode: "TOO_MANY_CODES" },
    });
  });

  it("keeps a detail code but not the message when the message isn't for people", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { message: "Token revoked at 10:02", detailCode: "REVOKED" }));

    const result = await apiRequest("/staff/me/", { schema });

    expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED", detailCode: "REVOKED" } });
    expect(!result.ok && result.error.message).toBe("Your session has ended. Please log in again.");
  });

  it("never shows a server error's own text", async () => {
    fetchMock.mockResolvedValueOnce(json(500, { message: "Traceback: KeyError in views.py" }));

    const result = await apiRequest("/clients", { schema });

    expect(result).toMatchObject({ ok: false, error: { code: "UNAVAILABLE", status: 500 } });
    expect(!result.ok && result.error.message).not.toContain("Traceback");
  });

  it.each([
    [401, "UNAUTHENTICATED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [429, "RATE_LIMITED"],
  ])("turns status %i into %s", async (status, code) => {
    fetchMock.mockResolvedValueOnce(json(status, {}));

    expect(await apiRequest("/x", { schema })).toMatchObject({ ok: false, error: { code, status } });
  });

  it("reports an unreachable backend or a timeout as unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("Timed out", "TimeoutError"));

    expect(await apiRequest("/x", { schema })).toMatchObject({ ok: false, error: { code: "UNAVAILABLE", status: null } });
  });

  it("reports a missing API address as unavailable, without calling anything", async () => {
    vi.stubEnv("DASHBOARD_API_URL", "");

    expect(await apiRequest("/x", { schema })).toMatchObject({ ok: false, error: { code: "UNAVAILABLE" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
