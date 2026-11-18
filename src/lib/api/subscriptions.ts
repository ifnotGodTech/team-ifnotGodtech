import { z } from "zod";
import type { PlanId } from "@/types/catalogue";
import type { ClientSubscription, SubscriptionFilter, SubscriptionList } from "@/types/subscription";
import { isClientId } from "./clients";
import { apiError, type ApiResult } from "./errors";
import { apiRequest } from "./http";

// Subscriptions, through the backend's /staff/ endpoints. Changes on a client's behalf follow the same
// rules as the client's own; the backend records who made each one and emails the client to confirm.

const PLAN_IDS = ["starter", "growth", "pro", "custom"] as const satisfies readonly PlanId[];
const PERIODS = ["monthly", "six-months", "twelve-months"] as const;
const STATUSES = ["active", "cancelled", "ended"] as const;

const subscriptionSchema: z.ZodType<ClientSubscription> = z.object({
  planId: z.enum(PLAN_IDS),
  billingPeriod: z.enum(PERIODS),
  status: z.enum(STATUSES),
  currentPeriodEnd: z.string(),
  reminder: z.object({ dueOn: z.string(), sentOn: z.string().nullable() }).nullable(),
  changesLeftThisMonth: z.number().int(),
  setupFeePaidOn: z.string().nullable(),
  serviceIds: z.array(z.string()),
  pendingPlanId: z.enum(PLAN_IDS).nullable(),
  payments: z.array(z.object({ id: z.string(), paidOn: z.string(), description: z.string(), amount: z.number() })),
  paymentDue: z.object({ amount: z.number().nullable(), workingUntil: z.string(), payUrl: z.string().nullable() }).nullable(),
});
const clientSubscriptionSchema = z.object({ subscription: subscriptionSchema.nullable() }).transform((body) => body.subscription);
const listSchema: z.ZodType<SubscriptionList> = z.object({
  items: z.array(
    z.object({
      clientId: z.string(),
      clientName: z.string(),
      planName: z.string(),
      pendingPlanName: z.string().nullable(),
      billingPeriod: z.enum(PERIODS),
      status: z.enum(STATUSES),
      currentPeriodEnd: z.string(),
      servicesChosen: z.number().int(),
      servicesIncluded: z.number().int().nullable(),
    })
  ),
  counts: z.object({ all: z.number(), active: z.number(), renewing: z.number(), cancelled: z.number() }),
});

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const notFound = (): ApiResult<never> => ({ ok: false, error: apiError("NOT_FOUND", 404) });

// The page shows every running plan at once, so it asks for the most a page allows.
const LIST_PAGE_SIZE = 100;

/** Soonest renewal or end first, with a count for each filter. */
export function listSubscriptions(token: string, filter: SubscriptionFilter): Promise<ApiResult<SubscriptionList>> {
  return apiRequest(`/staff/subscriptions/?filter=${filter}&pageSize=${LIST_PAGE_SIZE}`, { schema: listSchema, headers: bearer(token) });
}

/** Null for a client without a plan. */
export async function getSubscription(token: string, clientId: string): Promise<ApiResult<ClientSubscription | null>> {
  if (!isClientId(clientId)) return notFound();
  return apiRequest(`/staff/clients/${clientId}/subscription/`, { schema: clientSubscriptionSchema, headers: bearer(token) });
}

async function change(token: string, clientId: string, action: string, method: "POST" | "PUT", body?: unknown) {
  if (!isClientId(clientId)) return notFound();
  return apiRequest(`/staff/clients/${clientId}/subscription/${action}/`, { method, body: body ?? {}, schema: clientSubscriptionSchema, headers: bearer(token) });
}

/** Stops the plan renewing. Everything keeps working to the end of the paid period. */
export const cancelSubscription = (token: string, clientId: string) => change(token, clientId, "cancel", "POST");
/** Undoes a cancellation while the paid period is still running. */
export const keepSubscription = (token: string, clientId: string) => change(token, clientId, "keep", "POST");
/** Each service added in place of another uses one of the month's changes. */
export const updateServices = (token: string, clientId: string, serviceIds: string[]) => change(token, clientId, "services", "PUT", { serviceIds });
/** Starts at the next renewal. Choosing the current plan drops a waiting change. */
export const changePlan = (token: string, clientId: string, planId: PlanId) => change(token, clientId, "plan", "POST", { planId });
