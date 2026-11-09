import { describe, expect, it } from "vitest";
import { openJson, sealJson } from "./sealing";

describe("sealed cookie values", () => {
  it("round-trips data, differently each time", () => {
    const first = sealJson({ token: "abc" }, "secret");

    expect(openJson(first, "secret")).toEqual({ token: "abc" });
    expect(sealJson({ token: "abc" }, "secret")).not.toBe(first);
  });

  it("refuses another secret, a changed value, and junk", () => {
    const value = sealJson({ token: "abc" }, "secret");
    const bytes = Buffer.from(value, "base64url");
    bytes[bytes.length - 1] ^= 1;

    expect(openJson(value, "other")).toBeNull();
    expect(openJson(bytes.toString("base64url"), "secret")).toBeNull();
    expect(openJson("not-sealed", "secret")).toBeNull();
  });
});
