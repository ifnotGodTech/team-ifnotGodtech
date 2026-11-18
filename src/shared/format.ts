// Naira amounts and dates, shown in Lagos time so a date never shifts by a day.

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Africa/Lagos",
});

const weekdayDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });

export const formatNaira = (amount: number) => naira.format(amount);

/** "Sunday 8 November 2026". */
export const formatWeekdayDate = (iso: string) => weekdayDate.format(toDate(iso)).replace(",", "");

/** "8 Nov". */
export const formatDayMonth = (iso: string) => dayMonth.format(toDate(iso));

/** "8 December 2026". Accepts an ISO date or date-time. */
export const formatLongDate = (iso: string) => longDate.format(toDate(iso));

/** "8 Dec 2026". */
export const formatShortDate = (iso: string) => shortDate.format(toDate(iso));

/** "8 Dec 2026, 9:14 am". */
export const formatDateTime = (iso: string) => dateTime.format(toDate(iso)).replace(" AM", " am").replace(" PM", " pm");

// A bare date ("2026-12-08") is a calendar date, so it's read as midday in Lagos to stay on that day.
function toDate(iso: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00+01:00` : iso);
}
