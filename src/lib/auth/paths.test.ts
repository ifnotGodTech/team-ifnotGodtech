import { describe, expect, it } from "vitest";
import { loginPath, safeNextPath } from "./paths";

describe("safeNextPath", () => {
  it.each(["/clients", "/clients/c1?tab=payments"])("keeps %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([undefined, "", "clients", "https://evil.example", "//evil.example", "/\\evil.example", "/login", "/login/code"])("falls back to the overview for %j", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });
});

describe("loginPath", () => {
  it("carries where to go next and why", () => {
    expect(loginPath("/clients", "expired")).toBe("/login?next=%2Fclients&reason=expired");
    expect(loginPath("/", "signed-out")).toBe("/login?reason=signed-out");
    expect(loginPath("/")).toBe("/login");
  });
});
