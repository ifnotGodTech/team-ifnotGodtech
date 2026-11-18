import { z } from "zod";
import type { LeadDetail, LeadFilter, LeadList, LeadStatus } from "@/types/lead";
import { LEADS_PAGE_SIZE } from "@/shared/leads";
import { apiError, type ApiResult } from "./errors";
import { apiRequest } from "./http";

// Free audit requests from the website, through the backend's /staff/leads/ endpoints.

const STATUSES = ["new", "contacted", "closed"] as const;
const summaryShape = {
  id: z.string(),
  fullName: z.string(),
  organisation: z.string().nullable(),
  planName: z.string().nullable(),
  receivedAt: z.string(),
  status: z.enum(STATUSES),
};
const listSchema: z.ZodType<LeadList> = z.object({
  items: z.array(z.object(summaryShape)),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  counts: z.object({ all: z.number(), new: z.number(), contacted: z.number(), closed: z.number() }),
});
const detailSchema: z.ZodType<LeadDetail> = z.object({
  ...summaryShape,
  email: z.string(),
  phone: z.string().nullable(),
  challenge: z.string(),
  deletedOn: z.string(),
});

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const isLeadId = (id: string) => /^\d{1,18}$/.test(id);

/** Newest first, with a count for each status. */
export function listLeads(token: string, filter: LeadFilter, page = 1, pageSize = LEADS_PAGE_SIZE): Promise<ApiResult<LeadList>> {
  const params = new URLSearchParams({ status: filter, page: String(Math.max(1, page)), pageSize: String(pageSize) });
  return apiRequest(`/staff/leads/?${params}`, { schema: listSchema, headers: bearer(token) });
}

/** One lead. The backend records that staff opened it, as access to personal data. */
export async function getLead(token: string, id: string): Promise<ApiResult<LeadDetail>> {
  if (!isLeadId(id)) return { ok: false, error: apiError("NOT_FOUND", 404) };
  return apiRequest(`/staff/leads/${id}/`, { schema: detailSchema, headers: bearer(token) });
}

export async function setLeadStatus(token: string, id: string, status: LeadStatus): Promise<ApiResult<LeadDetail>> {
  if (!isLeadId(id)) return { ok: false, error: apiError("NOT_FOUND", 404) };
  return apiRequest(`/staff/leads/${id}/`, { method: "PATCH", body: { status }, schema: detailSchema, headers: bearer(token) });
}
