import { describe, expect, it } from "vitest";
import { IDLE_LIMIT_MS } from "./constants";
import { checkSession, encodeLoggedOut, encodeSession, loggedOutAt } from "./session";

const staff = { id: "s1", name: "Tunde", email: "tunde@ifnotgod.com" };

describe("staff session", () => {
  it("keeps when it started across refreshes", () => {
    const refreshed = encodeSession(staff, "secret", 5_000, 1_000);

    expect(checkSession(refreshed, "secret", 5_000)).toMatchObject({ status: "active", startedAt: 1_000, expiresAt: 5_000 + IDLE_LIMIT_MS });
  });

  it("refuses a session that started before the last log out, even if refreshed since", () => {
    const loggedOut = loggedOutAt(encodeLoggedOut("secret", 2_000), "secret");
    const refreshedLater = encodeSession(staff, "secret", 3_000, 1_000);
    const newLogIn = encodeSession(staff, "secret", 3_000);

    expect(loggedOut).toBe(2_000);
    expect(checkSession(refreshedLater, "secret", 3_000, loggedOut)).toEqual({ status: "none" });
    expect(checkSession(newLogIn, "secret", 3_000, loggedOut)).toMatchObject({ status: "active" });
  });

  it("ignores a changed log out marker", () => {
    expect(loggedOutAt("forged.value", "secret")).toBeNull();
    expect(loggedOutAt(undefined, "secret")).toBeNull();
  });

  it("is active within the hour, ending an hour after the last activity", () => {
    const value = encodeSession(staff, "secret", 1_000);

    expect(checkSession(value, "secret", 1_000 + IDLE_LIMIT_MS - 1)).toEqual({ status: "active", staff, expiresAt: 1_000 + IDLE_LIMIT_MS, startedAt: 1_000 });
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
