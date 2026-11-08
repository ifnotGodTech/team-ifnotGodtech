import { describe, expect, it } from "vitest";
import { formatDateTime, formatLongDate, formatNaira, formatShortDate } from "./format";

describe("formatting", () => {
  it("shows naira with no kobo", () => {
    expect(formatNaira(140_000)).toBe("₦140,000");
  });

  it("keeps a calendar date on the same day", () => {
    expect(formatLongDate("2026-12-08")).toBe("8 December 2026");
    expect(formatShortDate("2026-12-08")).toBe("8 Dec 2026");
  });

  it("shows times in Lagos", () => {
    expect(formatDateTime("2026-11-08T08:14:00Z")).toBe("8 Nov 2026, 9:14 am");
  });

  it("shows a late-evening UTC time as the next Lagos day", () => {
    expect(formatLongDate("2026-11-08T23:30:00Z")).toBe("9 November 2026");
  });
});
