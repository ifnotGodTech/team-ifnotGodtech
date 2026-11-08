import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cookieSecret } from "@/lib/auth/signing";
import { encodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { proxy } from "./proxy";

const staff = { id: "s1", name: "Tunde", email: "tunde@ifnotgod.com" };
const request = (path: string, cookie?: string, method = "GET") =>
  new NextRequest(`http://localhost${path}`, { method, headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {} });

describe("proxy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sends signed-out visitors to log in, remembering where they were going", () => {
    const response = proxy(request("/clients?q=ada"));

    expect(response.headers.get("location")).toBe("http://localhost/login?next=%2Fclients%3Fq%3Dada");
  });

  it("says why when the session has expired", () => {
    const response = proxy(request("/clients", encodeSession(staff, cookieSecret(), Date.now() - 61 * 60 * 1000)));

    expect(response.headers.get("location")).toBe("http://localhost/login?next=%2Fclients&reason=expired");
  });

  it("lets signed-in staff through and restarts their hour", () => {
    const response = proxy(request("/clients", encodeSession(staff, cookieSecret(), Date.now() - 30 * 60 * 1000)));

    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get(SESSION_COOKIE)?.httpOnly).toBe(true);
  });

  it("leaves log in pages and form posts alone", () => {
    expect(proxy(request("/login")).headers.get("location")).toBeNull();
    expect(proxy(request("/clients", undefined, "POST")).headers.get("location")).toBeNull();
  });

  it("does nothing on the live site, where every page is hidden", () => {
    vi.stubEnv("VERCEL_ENV", "production");

    expect(proxy(request("/clients")).headers.get("location")).toBeNull();
  });
});
