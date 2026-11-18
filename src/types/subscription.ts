import type { PlanId } from "./catalogue";

// The contract with the backend's subscriptions API. The stand-in in src/lib/api follows it.

export type BillingPeriod = "monthly" | "six-months" | "twelve-months";

/** "cancelled" keeps working until the paid period ends, then becomes "ended". */
export type SubscriptionStatus = "active" | "cancelled" | "ended";

export type Payment = {
  id: string;
  /** ISO date. */
  paidOn: string;
  description: string;
  /** In naira. */
  amount: number;
};

export type ClientSubscription = {
  planId: PlanId;
  billingPeriod: BillingPeriod;
  status: SubscriptionStatus;
  /** ISO date. The plan renews on this date, or ends then if cancelled. */
  currentPeriodEnd: string;
  /** The reminder before renewal, or null when the plan won't renew. */
  reminder: { dueOn: string; sentOn: string | null } | null;
  changesLeftThisMonth: number;
  /** Null when the setup fee was waived for paying 6 or more months upfront. */
  setupFeePaidOn: string | null;
  serviceIds: string[];
  /** A plan change waiting for the next renewal. */
  pendingPlanId: PlanId | null;
  /** Newest first. Never includes card details. */
  payments: Payment[];
  /** A renewal that hasn't been paid yet, while the plan keeps working for a few days. */
  paymentDue?: { amount: number | null; workingUntil: string; payUrl: string | null } | null;
};

export type SubscriptionFilter = "all" | "active" | "renewing" | "cancelled";

export type SubscriptionRow = {
  clientId: string;
  clientName: string;
  planName: string;
  pendingPlanName: string | null;
  billingPeriod: BillingPeriod;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  servicesChosen: number;
  /** Null when the number is agreed per client. */
  servicesIncluded: number | null;
};

export type SubscriptionList = {
  /** Soonest renewal or end first. */
  items: SubscriptionRow[];
  counts: Record<SubscriptionFilter, number>;
};
