import { z } from "zod";
import type { Catalogue, GroupDraft, Plan, PlanId, PlanUpdate, Service, ServiceDraft, ServiceGroup, SiteText } from "@/types/catalogue";
import type { ApiResult } from "./errors";
import { apiRequest } from "./http";

// Site content, through the backend's /staff/catalogue/ and /staff/site-text/ endpoints. Each save is recorded
// with who made it, and the backend asks WEB to refresh its pages.

const PLAN_IDS = ["starter", "growth", "pro", "custom"] as const satisfies readonly PlanId[];
const PRICED = ["starter", "growth", "pro"] as const;
const agreedOr = z.union([z.number().int(), z.literal("agreed")]);

const planSchema: z.ZodType<Plan> = z.object({
  id: z.enum(PLAN_IDS),
  name: z.string(),
  monthlyPrice: z.number().nullable(),
  monthlyChanges: agreedOr,
  allowances: z.record(z.string(), agreedOr),
  lines: z.array(z.string()),
  recommended: z.boolean(),
});
const groupSchema: z.ZodType<ServiceGroup> = z.object({ id: z.string(), name: z.string(), unitSingular: z.string(), unitPlural: z.string() });
const serviceSchema: z.ZodType<Service> = z.object({
  id: z.string(),
  group: z.string(),
  name: z.string(),
  problem: z.string(),
  // Custom can include any service, by agreement, so only priced plans are listed.
  plans: z.array(z.string()).transform((ids) => ids.filter((id): id is (typeof PRICED)[number] => (PRICED as readonly string[]).includes(id))),
  available: z.boolean(),
});
const catalogueSchema: z.ZodType<Catalogue> = z.object({ plans: z.array(planSchema), groups: z.array(groupSchema), services: z.array(serviceSchema) });
const siteTextSchema: z.ZodType<SiteText> = z.object({ headline: z.string(), introduction: z.string(), closingCallToAction: z.string() });

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/** Every plan, group and service, including services taken off the website. */
export function getCatalogue(token: string): Promise<ApiResult<Catalogue>> {
  return apiRequest("/staff/catalogue/", { schema: catalogueSchema, headers: bearer(token) });
}

export function getSiteText(token: string): Promise<ApiResult<SiteText>> {
  return apiRequest("/site-text/", { schema: siteTextSchema, headers: bearer(token) });
}

/** At most one plan is recommended, so recommending one stops recommending the others. */
export function savePlan(token: string, planId: PlanId, update: PlanUpdate): Promise<ApiResult<Plan>> {
  return apiRequest(`/staff/catalogue/plans/${planId}/`, { method: "PUT", body: update, schema: planSchema, headers: bearer(token) });
}

/** Adds a service when its id is null, otherwise updates it. */
export function saveService(token: string, { id, name, problem, group, plans }: ServiceDraft): Promise<ApiResult<Service>> {
  const body = { name, problem, group, plans };
  return id
    ? apiRequest(`/staff/catalogue/services/${encodeURIComponent(id)}/`, { method: "PUT", body, schema: serviceSchema, headers: bearer(token) })
    : apiRequest("/staff/catalogue/services/", { method: "POST", body, schema: serviceSchema, headers: bearer(token) });
}

/** Hidden services stay running for clients who already have them. */
export function setServiceShown(token: string, serviceId: string, shown: boolean): Promise<ApiResult<Service>> {
  return apiRequest(`/staff/catalogue/services/${encodeURIComponent(serviceId)}/shown/`, {
    method: "POST",
    body: { shown },
    schema: serviceSchema,
    headers: bearer(token),
  });
}

/** Adds a group when its id is null, otherwise renames it. */
export function saveGroup(token: string, { id, name, unitSingular, unitPlural }: GroupDraft): Promise<ApiResult<ServiceGroup>> {
  const body = { name, unitSingular, unitPlural };
  return id
    ? apiRequest(`/staff/catalogue/groups/${encodeURIComponent(id)}/`, { method: "PUT", body, schema: groupSchema, headers: bearer(token) })
    : apiRequest("/staff/catalogue/groups/", { method: "POST", body, schema: groupSchema, headers: bearer(token) });
}

export function saveSiteText(token: string, text: SiteText): Promise<ApiResult<SiteText>> {
  return apiRequest("/staff/site-text/", { method: "PUT", body: text, schema: siteTextSchema, headers: bearer(token) });
}
