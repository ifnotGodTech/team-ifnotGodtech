import type { Allowance, Catalogue, Plan, PlanId, Service, ServiceGroup } from "@/types/catalogue";
import type { BillingPeriod, SubscriptionFilter } from "@/types/subscription";

// Rules shown in the UI. The backend enforces them; these explain them and check forms early.

export const RENEWING_SOON_DAYS = 7;

export const FILTERS: readonly { id: SubscriptionFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "renewing", label: `Renewing in ${RENEWING_SOON_DAYS} days` },
  { id: "cancelled", label: "Cancelled, still running" },
];

export function isSubscriptionFilter(value: unknown): value is SubscriptionFilter {
  return FILTERS.some((filter) => filter.id === value);
}

const PERIODS: Record<BillingPeriod, { short: string; paid: string }> = {
  monthly: { short: "Monthly", paid: "paid monthly" },
  "six-months": { short: "6 months", paid: "paid 6 months upfront" },
  "twelve-months": { short: "12 months", paid: "paid 12 months upfront" },
};

/** "Monthly", "6 months". */
export const periodLabel = (period: BillingPeriod) => PERIODS[period].short;
/** "paid monthly", "paid 6 months upfront". */
export const paidLabel = (period: BillingPeriod) => PERIODS[period].paid;

const PLAN_ORDER: readonly PlanId[] = ["starter", "growth", "pro", "custom"];

export function isIncludedInPlan(service: Service, planId: PlanId): boolean {
  return PLAN_ORDER.indexOf(planId) >= PLAN_ORDER.indexOf(service.includedFrom);
}

/** "3 everyday automations", "1 AI agent", or the group's name when agreed per client. */
export function allowanceLabel(group: ServiceGroup, allowance: Allowance): string {
  if (allowance === "agreed") return group.name;
  return `${allowance} ${allowance === 1 ? group.unitSingular : group.unitPlural}`;
}

/** How many services a plan includes in all, or null when agreed per client. */
export function servicesIncluded(plan: Plan): number | null {
  const allowances = Object.values(plan.allowances);
  return allowances.every((allowance) => typeof allowance === "number") ? (allowances as number[]).reduce((sum, n) => sum + n, 0) : null;
}

export type ServiceChoice = { group: ServiceGroup; allowance: Allowance; label: string; services: Service[] };

/**
 * What a client on this plan can choose from, by group. A service taken off the website
 * is still listed for a client who already has it, because it keeps running for them.
 */
export function serviceChoices(plan: Plan, catalogue: Catalogue, current: string[] = []): ServiceChoice[] {
  return catalogue.groups.flatMap((group) => {
    const allowance = plan.allowances[group.id];
    if (allowance === 0) return [];
    const services = catalogue.services.filter(
      (service) => service.group === group.id && isIncludedInPlan(service, plan.id) && (service.available || current.includes(service.id))
    );
    return services.length ? [{ group, allowance, label: allowanceLabel(group, allowance), services }] : [];
  });
}

export type SelectionCheck =
  | { ok: true; changesUsed: number }
  | { ok: false; reason: "duplicate" | "not-offered" | "too-many"; group?: ServiceGroup; allowance?: number }
  | { ok: false; reason: "no-changes-left"; changesUsed: number };

/**
 * Checks a new set of services against the plan. Choosing for the first time is free.
 * After that, each service added in place of another uses one of the month's changes.
 */
export function checkServiceSelection(choices: ServiceChoice[], current: string[], next: string[], changesLeft: number): SelectionCheck {
  if (new Set(next).size !== next.length) return { ok: false, reason: "duplicate" };

  const offered = new Set(choices.flatMap((choice) => choice.services.map((service) => service.id)));
  if (next.some((id) => !offered.has(id))) return { ok: false, reason: "not-offered" };

  for (const choice of choices) {
    if (choice.allowance === "agreed") continue;
    const picked = choice.services.filter((service) => next.includes(service.id)).length;
    if (picked > choice.allowance) return { ok: false, reason: "too-many", group: choice.group, allowance: choice.allowance };
  }

  if (current.length === 0) return { ok: true, changesUsed: 0 };
  const changesUsed = next.filter((id) => !current.includes(id)).length;
  if (changesUsed > changesLeft) return { ok: false, reason: "no-changes-left", changesUsed };
  return { ok: true, changesUsed };
}

/** Plans that can be chosen on a client's behalf. Custom is quoted after the audit instead. */
export const pricedPlans = (catalogue: Catalogue) => catalogue.plans.filter((plan) => plan.monthlyPrice !== null);
