import { describe, expect, it } from "vitest";
import { IDLE_LIMIT_MS } from "./constants";
import { checkSession, encodeSession } from "./session";

const staff = { id: "s1", name: "Tunde", email: "tunde@ifnotgod.com" };

describe("staff session cookie", () => {
  it("is active within the hour, carrying the backend's token", () => {
    const value = encodeSession(staff, "backend-token", "secret", 1_000);

    expect(checkSession(value, "secret", 1_000 + IDLE_LIMIT_MS - 1)).toEqual({
      status: "active",
      staff,
      token: "backend-token",
      expiresAt: 1_000 + IDLE_LIMIT_MS,
    });
  });

  it("keeps the token out of sight: the cookie is encrypted, not just signed", () => {
    const value = encodeSession(staff, "backend-token", "secret");

    expect(Buffer.from(value, "base64url").toString("latin1")).not.toContain("backend-token");
    expect(value).not.toContain("tunde");
  });

  it("expires after an hour without activity", () => {
    expect(checkSession(encodeSession(staff, "t", "secret", 0), "secret", IDLE_LIMIT_MS)).toEqual({ status: "expired" });
  });

  it.each([undefined, "", "a.b", "a.b.c", "AAAA"])("treats %j as no session", (value) => {
    expect(checkSession(value, "secret")).toEqual({ status: "none" });
  });

  it("refuses a session sealed with another secret, or changed", () => {
    const value = encodeSession(staff, "t", "secret");
    const changed = `${value.slice(0, -2)}${value.endsWith("A") ? "B" : "A"}${value.slice(-1)}`;

    expect(checkSession(value, "other")).toEqual({ status: "none" });
    expect(checkSession(changed, "secret")).toEqual({ status: "none" });
  });
});
