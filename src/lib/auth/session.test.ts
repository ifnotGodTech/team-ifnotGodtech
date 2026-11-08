import { describe, expect, it } from "vitest";
import { IDLE_LIMIT_MS } from "./constants";
import { checkSession, encodeSession } from "./session";

const staff = { id: "s1", name: "Tunde", email: "tunde@ifnotgod.com" };

describe("staff session", () => {
  it("is active within the hour, ending an hour after the last activity", () => {
    const value = encodeSession(staff, "secret", 1_000);

    expect(checkSession(value, "secret", 1_000 + IDLE_LIMIT_MS - 1)).toEqual({ status: "active", staff, expiresAt: 1_000 + IDLE_LIMIT_MS });
  });

  it("expires after an hour without activity", () => {
    expect(checkSession(encodeSession(staff, "secret", 0), "secret", IDLE_LIMIT_MS)).toEqual({ status: "expired" });
  });

  it.each([undefined, "", "a.b", "a.b.c"])("treats %j as no session", (value) => {
    expect(checkSession(value, "secret")).toEqual({ status: "none" });
  });

  it("refuses a session signed with another secret, or changed", () => {
    const value = encodeSession(staff, "secret");

    expect(checkSession(value, "other")).toEqual({ status: "none" });
    expect(checkSession(`x${value}`, "secret")).toEqual({ status: "none" });
  });
});
