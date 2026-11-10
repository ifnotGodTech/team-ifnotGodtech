import { z } from "zod";
import type { Overview } from "@/types/overview";
import type { ApiResult } from "./errors";
import { apiRequest } from "./http";

// The overview's figures, through the backend's /staff/overview/ endpoint.

const PERIODS = ["monthly", "six-months", "twelve-months"] as const;

const overviewSchema: z.ZodType<Overview> = z.object({
  activeSubscriptions: z.number().int(),
  monthlyIncome: z.number(),
  renewingSoon: z.array(
    z.object({
      clientId: z.string(),
      clientName: z.string(),
      planName: z.string(),
      billingPeriod: z.enum(PERIODS),
      renewsOn: z.string(),
      reminder: z.object({ dueOn: z.string(), sentOn: z.string().nullable() }).nullable(),
    })
  ),
  cancelledStillRunning: z.number().int(),
  nextCancellationEnds: z.string().nullable(),
  clientsWithoutPlan: z.number().int(),
  recentChanges: z.array(
    z.object({ id: z.string(), at: z.string(), text: z.string(), by: z.string(), clientId: z.string().nullable(), clientName: z.string().nullable() })
  ),
});

/** Counts, upcoming renewals and recent changes for the overview page. */
export function getOverview(token: string): Promise<ApiResult<Overview>> {
  return apiRequest("/staff/overview/", { schema: overviewSchema, headers: { authorization: `Bearer ${token}` } });
}
