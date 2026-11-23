import { z } from "zod";
import { formatNaira } from "@/shared/format";
import type { BillingTerms, Plan, PlanId } from "@/types/catalogue";

// Rules for editing site content, shown in forms and checked again on the server.
// The backend enforces them too and has the final say.

export const PRICE_RULE =
  "A new price applies to new subscribers straight away, and to existing subscribers from their next renewal. Their renewal reminder shows it.";
export const WHEN_LIVE = "It appears on the website within a few minutes.";
export const HIDE_RULE =
  "New clients won't see or choose it. It keeps running for clients who already have it, until we let them know and move them on.";

export const BILLING_RULE =
  "Changes apply to the next checkout. Clients who have already paid a setup fee never pay it again. A change to free months applies to upfront renewals from their next renewal, and their renewal reminder shows the amount.";
export const MAX_SETUP_FEE = 10_000_000;

/** Each way of paying, with its fields in the billing terms. Monthly has no free months: a ₦0 first payment can't save a card. */
export const PAYMENT_OPTIONS = [
  { label: "Monthly", waiver: "monthlySetupFeeWaived", freeMonths: null, maxFreeMonths: 0 },
  { label: "6 months upfront", waiver: "sixMonthsSetupFeeWaived", freeMonths: "sixMonthsFreeMonths", maxFreeMonths: 5 },
  { label: "12 months upfront", waiver: "twelveMonthsSetupFeeWaived", freeMonths: "twelveMonthsFreeMonths", maxFreeMonths: 11 },
] as const;

/** What clients see for each way of paying, such as "12 months upfront: 2 months free, and a ₦100,000 setup fee". */
export function describeBillingTerms(terms: BillingTerms): string[] {
  return PAYMENT_OPTIONS.map((option) => {
    const free = option.freeMonths ? terms[option.freeMonths] : 0;
    const fee = terms.setupFee > 0 && !terms[option.waiver] ? `a ${formatNaira(terms.setupFee)} setup fee` : "no setup fee";
    const months = free ? `${free} ${free === 1 ? "month" : "months"} free, and ` : "";
    return `${option.label}: ${months}${fee}`;
  });
}

export const MAX_PLAN_LINES = 8;
export const PRICED_PLANS: readonly PlanId[] = ["starter", "growth", "pro"];

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `Enter ${label}.`)
    .max(max, `Keep ${label} to ${max} characters or fewer.`);

/** "40,000" or "40000" as a whole number of naira. */
const naira = z
  .string()
  .trim()
  .transform((value) => value.replace(/[,\s₦]/g, ""))
  .pipe(z.string().regex(/^\d+$/, "Enter the price in whole naira, such as 40,000."))
  .transform(Number)
  .pipe(z.number().min(1_000, "The price must be at least ₦1,000.").max(10_000_000, "The price must be ₦10,000,000 or less."));

const count = (label: string, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `Enter ${label} as a whole number.`)
    .transform(Number)
    .pipe(z.number().max(max, `${label[0].toUpperCase()}${label.slice(1)} can be at most ${max}.`));

export const planSchema = z.object({
  monthlyPrice: naira,
  monthlyChanges: count("changes a month", 20),
  allowances: z.record(z.string(), count("services from a group", 50)),
  lines: z.array(text("each line", 1, 80)).max(MAX_PLAN_LINES, `A plan can list up to ${MAX_PLAN_LINES} other things.`),
  recommended: z.boolean(),
});

/** The same rules for a plan update that's already numbers, as the backend receives it. */
export const planUpdateSchema = z.object({
  monthlyPrice: z.number().int().min(1_000, "The price must be at least ₦1,000.").max(10_000_000, "The price must be ₦10,000,000 or less."),
  monthlyChanges: z.number().int().min(0).max(20, "Changes a month can be at most 20."),
  allowances: z.record(z.string(), z.number().int().min(0).max(50, "Services from a group can be at most 50.")),
  lines: z.array(z.string().trim().min(1).max(80, "Keep each line to 80 characters or fewer.")).max(MAX_PLAN_LINES, `A plan can list up to ${MAX_PLAN_LINES} other things.`),
  recommended: z.boolean(),
});

export const serviceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,64}$/).nullable(),
  name: text("a name", 2, 60),
  problem: text("the problem it solves", 5, 120),
  group: z.string().regex(/^[a-z0-9-]{1,64}$/, "Choose a group."),
  plans: z.array(z.enum(["starter", "growth", "pro"])).min(1, "Choose at least one plan."),
});

export const groupSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,64}$/).nullable(),
  name: text("a name", 2, 40),
  unitSingular: text("the word for one", 2, 40),
  unitPlural: text("the word for several", 2, 40),
});

const waiver = z.enum(["charged", "waived"], { message: "Choose charged or waived." }).transform((value) => value === "waived");

export const billingTermsSchema = z.object({
  setupFee: z
    .string()
    .trim()
    .transform((value) => value.replace(/[,\s₦]/g, ""))
    .pipe(z.string().regex(/^\d+$/, "Enter the setup fee in whole naira, such as 100,000, or 0 for none."))
    .transform(Number)
    .pipe(z.number().max(MAX_SETUP_FEE, `The setup fee must be ₦${MAX_SETUP_FEE.toLocaleString("en-NG")} or less.`)),
  monthlySetupFeeWaived: waiver,
  sixMonthsSetupFeeWaived: waiver,
  twelveMonthsSetupFeeWaived: waiver,
  sixMonthsFreeMonths: count("free months on 6 months", PAYMENT_OPTIONS[1].maxFreeMonths),
  twelveMonthsFreeMonths: count("free months on 12 months", PAYMENT_OPTIONS[2].maxFreeMonths),
});

export const siteTextSchema = z.object({
  headline: text("a headline", 5, 120),
  introduction: text("an introduction", 20, 400),
  closingCallToAction: text("a closing call to action", 5, 120),
});

/** Field errors keyed by field name, keeping the first message for each. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[issue.path.join(".")] ??= issue.message;
  return errors;
}

/** "lead-follow-up" from "Lead follow-up", for new services and groups. */
export const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "item";

/**
 * When a lower plan includes a service but a higher one doesn't, a client moving up would lose it.
 * Allowed, but worth a warning.
 */
export function planGap(plans: Pick<Plan, "id" | "name">[], ticked: PlanId[]): string | null {
  const priced = plans.filter((plan) => PRICED_PLANS.includes(plan.id));
  for (let high = 1; high < priced.length; high++) {
    if (ticked.includes(priced[high].id)) continue;
    // The nearest plan below that includes it, as that's the move a client would make.
    const low = priced.slice(0, high).findLast((plan) => ticked.includes(plan.id));
    if (low) {
      return `${low.name} includes this service, but ${priced[high].name} doesn't. A client moving up to ${priced[high].name} would lose it. You can still save.`;
    }
  }
  return null;
}

/** What happens to clients on plans a service is being taken off. */
export function removalNote(plans: Pick<Plan, "id" | "name">[], before: PlanId[], ticked: PlanId[]): string | null {
  const removed = plans.filter((plan) => before.includes(plan.id) && !ticked.includes(plan.id)).map((plan) => plan.name);
  if (removed.length === 0) return null;
  const names = removed.length === 1 ? removed[0] : `${removed.slice(0, -1).join(", ")} and ${removed.at(-1)}`;
  return `Clients on ${names} who already have it keep it until we let them know and move them on. New clients on ${removed.length === 1 ? "that plan" : "those plans"} won't see it.`;
}

/** "Starter, Growth and Pro", "Pro only". */
export function plansList(plans: Pick<Plan, "id" | "name">[], ids: PlanId[]): string {
  const names = plans.filter((plan) => ids.includes(plan.id)).map((plan) => plan.name);
  if (names.length === 0) return "no plan";
  if (names.length === 1) return `${names[0]} only`;
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
