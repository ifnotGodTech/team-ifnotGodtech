import type { ClientHistoryEntry } from "./client";
import type { BillingPeriod, ClientSubscription } from "./subscription";

// The contract with the backend's overview API. The stand-in in src/lib/api follows it.

export type UpcomingRenewal = {
  clientId: string;
  clientName: string;
  planName: string;
  billingPeriod: BillingPeriod;
  /** ISO date. */
  renewsOn: string;
  reminder: ClientSubscription["reminder"];
};

/** A change to a client, or to site content, when the client fields are null. */
export type RecentChange = ClientHistoryEntry & { clientId: string | null; clientName: string | null };

export type Overview = {
  activeSubscriptions: number;
  /** In naira: what active plans cost a month at their plan prices, before upfront discounts. */
  monthlyIncome: number;
  /** Soonest first. */
  renewingSoon: UpcomingRenewal[];
  cancelledStillRunning: number;
  /** ISO date the next cancelled plan ends, or null when there are none. */
  nextCancellationEnds: string | null;
  clientsWithoutPlan: number;
  /** Newest first, across every client. */
  recentChanges: RecentChange[];
};
