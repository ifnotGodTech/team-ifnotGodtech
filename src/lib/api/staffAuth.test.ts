import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkCode, getSignedInStaff, logOut, sendNewCode, startLogIn } from "./staffAuth";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const fetchMock = vi.fn();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const staff = { id: "1", name: "Tunde Bakare", email: "tunde@ifnotgod.com" };
const challenge = { challengeId: "6f1c1d9e-0000-4000-8000-000000000000", sentTo: "tunde@ifnotgod.com", expiresAt: "2026-11-09T10:10:00Z" };
const call = (n = 0) => {
  const [url, options] = fetchMock.mock.calls[n];
  return { url, method: options.method, headers: options.headers, body: options.body ? JSON.parse(options.body) : undefined };
};

describe("staff log in API", () => {
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

  it("starts a log in with the email and password", async () => {
    fetchMock.mockResolvedValueOnce(json(201, challenge));

    expect(await startLogIn("tunde@ifnotgod.com", "pw")).toEqual({ ok: true, data: challenge });
    expect(call()).toMatchObject({ url: "https://api.example.com/api/v1/staff/log-in/", method: "POST", body: { email: "tunde@ifnotgod.com", password: "pw" } });
  });

  it("checks a code and returns the token with who signed in", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { token: "t0ken", staff }));

    expect(await checkCode(challenge.challengeId, "123456")).toEqual({ ok: true, data: { token: "t0ken", staff } });
    expect(call()).toMatchObject({ url: "https://api.example.com/api/v1/staff/log-in/code/", body: { challengeId: challenge.challengeId, code: "123456" } });
  });

  it("passes on why a code was refused", async () => {
    fetchMock.mockResolvedValueOnce(json(429, { code: "RATE_LIMITED", message: "Too many wrong codes. Please log in again.", errors: {}, detailCode: "TOO_MANY_CODES" }));

    expect(await checkCode(challenge.challengeId, "000000")).toMatchObject({ ok: false, error: { code: "RATE_LIMITED", detailCode: "TOO_MANY_CODES" } });
  });

  it("refuses a sign-in response without a token", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { token: "", staff }));

    expect(await checkCode(challenge.challengeId, "123456")).toMatchObject({ ok: false, error: { code: "UNEXPECTED" } });
  });

  it("asks for a new code", async () => {
    fetchMock.mockResolvedValueOnce(json(200, challenge));

    expect(await sendNewCode(challenge.challengeId)).toEqual({ ok: true, data: challenge });
    expect(call()).toMatchObject({ url: "https://api.example.com/api/v1/staff/log-in/new-code/", body: { challengeId: challenge.challengeId } });
  });

  it("sends the token to see who is signed in, and to log out", async () => {
    fetchMock.mockResolvedValueOnce(json(200, staff)).mockResolvedValueOnce(new Response(null, { status: 204 }));

    expect(await getSignedInStaff("t0ken")).toEqual({ ok: true, data: staff });
    expect(await logOut("t0ken")).toEqual({ ok: true, data: null });
    expect(call(0)).toMatchObject({ url: "https://api.example.com/api/v1/staff/me/", method: "GET", headers: { authorization: "Bearer t0ken" } });
    expect(call(1)).toMatchObject({ url: "https://api.example.com/api/v1/staff/log-out/", method: "POST", headers: { authorization: "Bearer t0ken" } });
  });

  it("reports an ended token as unauthenticated", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { code: "UNAUTHENTICATED", message: "Your session has ended.", errors: {} }));

    expect(await getSignedInStaff("old")).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });
});
