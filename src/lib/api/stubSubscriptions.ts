import type { BillingPeriod, ClientSubscription, Payment } from "@/types/subscription";
import type { PlanId } from "@/types/catalogue";
import { STUB_CATALOGUE } from "./stubCatalogue";
import { STUB_CLIENTS } from "./stubData";

// Made-up example subscriptions. Dates are counted from today, so "Renewing in 7 days" always
// has something to show. Reminders go out a few days before renewal.

export const REMINDER_DAYS_BEFORE = 3;
const SETUP_FEE = 100_000;

type Seed = {
  planId: PlanId;
  billingPeriod: BillingPeriod;
  status: "active" | "cancelled";
  endsInDays: number;
  serviceIds: string[];
  changesLeft: number;
  pendingPlanId?: PlanId;
};

const GROWTH_SIX = ["lead-follow-up", "appointment-booking", "daily-brief", "scheduling-posting", "performance-report", "whatsapp-sales-agent"];
const PRO_TEN = [...GROWTH_SIX.slice(0, 3), "payment-reminders", "digital-product-delivery", "scheduling-posting", "performance-report", "dm-assistant", "whatsapp-sales-agent", "ai-call-agent"];
const PRO_TWELVE = [...PRO_TEN, "brand-deal-inbox", "newsletter"];

export const SUBSCRIPTION_SEEDS: Record<string, Seed> = {
  "c-ada": { planId: "growth", billingPeriod: "monthly", status: "active", endsInDays: 2, serviceIds: GROWTH_SIX, changesLeft: 0 },
  "c-chinedu": { planId: "starter", billingPeriod: "monthly", status: "active", endsInDays: 4, serviceIds: ["payment-reminders", "scheduling-posting"], changesLeft: 1 },
  "c-grace": { planId: "pro", billingPeriod: "six-months", status: "active", endsInDays: 6, serviceIds: PRO_TEN, changesLeft: 2 },
  "c-tolu": { planId: "growth", billingPeriod: "monthly", status: "active", endsInDays: 3, serviceIds: GROWTH_SIX.slice(0, 4), changesLeft: 1 },
  "c-bisi": { planId: "starter", billingPeriod: "monthly", status: "active", endsInDays: 11, serviceIds: ["lead-follow-up", "comment-to-dm"], changesLeft: 1 },
  "c-emeka": { planId: "pro", billingPeriod: "monthly", status: "active", endsInDays: 24, serviceIds: PRO_TWELVE, changesLeft: 2 },
  "c-segun": { planId: "growth", billingPeriod: "six-months", status: "active", endsInDays: 118, serviceIds: GROWTH_SIX, changesLeft: 1 },
  "c-ifeoma": { planId: "growth", billingPeriod: "twelve-months", status: "active", endsInDays: 286, serviceIds: GROWTH_SIX, changesLeft: 1, pendingPlanId: "pro" },
  "c-funmi": { planId: "pro", billingPeriod: "monthly", status: "cancelled", endsInDays: 25, serviceIds: PRO_TWELVE, changesLeft: 2 },
  "c-kunle": { planId: "starter", billingPeriod: "monthly", status: "cancelled", endsInDays: 20, serviceIds: [], changesLeft: 1 },
};

const MONTHS: Record<BillingPeriod, number> = { monthly: 1, "six-months": 6, "twelve-months": 12 };
const PERIOD_TEXT: Record<BillingPeriod, string> = { monthly: "monthly", "six-months": "6 months", "twelve-months": "12 months" };

/** Today's date in Lagos, as an ISO date. */
export const lagosToday = (now: number) => new Date(now + 60 * 60 * 1000).toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function reminderFor(status: ClientSubscription["status"], periodEnd: string, today: string): ClientSubscription["reminder"] {
  if (status !== "active") return null;
  const dueOn = addDays(periodEnd, -REMINDER_DAYS_BEFORE);
  return { dueOn, sentOn: dueOn <= today ? dueOn : null };
}

function paymentsFor(seed: Seed, periodEnd: string, joinedOn: string): Payment[] {
  const plan = STUB_CATALOGUE.plans.find((item) => item.id === seed.planId)!;
  const months = MONTHS[seed.billingPeriod];
  const paidMonths = months === 12 ? 10 : months;
  const payments: Payment[] = [];
  for (let start = addMonths(periodEnd, -months); start >= joinedOn; start = addMonths(start, -months)) {
    payments.push({ id: `pay-${start}`, paidOn: start, description: `${plan.name}, ${PERIOD_TEXT[seed.billingPeriod]}`, amount: (plan.monthlyPrice ?? 0) * paidMonths });
  }
  const first = payments.at(-1);
  if (first && months === 1) {
    first.description += ", and setup fee";
    first.amount += SETUP_FEE;
  }
  return payments;
}

/** The example subscriptions as they stand today, by client id. */
export function seedSubscriptions(today: string): Record<string, ClientSubscription> {
  return Object.fromEntries(
    Object.entries(SUBSCRIPTION_SEEDS).map(([clientId, seed]) => {
      const joinedOn = STUB_CLIENTS.find((client) => client.id === clientId)!.joinedOn;
      const currentPeriodEnd = addDays(today, seed.endsInDays);
      const payments = paymentsFor(seed, currentPeriodEnd, joinedOn);
      const subscription: ClientSubscription = {
        planId: seed.planId,
        billingPeriod: seed.billingPeriod,
        status: seed.status,
        currentPeriodEnd,
        reminder: reminderFor(seed.status, currentPeriodEnd, today),
        changesLeftThisMonth: seed.changesLeft,
        setupFeePaidOn: seed.billingPeriod === "monthly" ? (payments.at(-1)?.paidOn ?? joinedOn) : null,
        serviceIds: seed.serviceIds,
        pendingPlanId: seed.pendingPlanId ?? null,
        payments,
      };
      return [clientId, subscription];
    })
  );
}
