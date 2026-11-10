import { z } from "zod";
import type { ClientDetail, ClientPage, ClientSearch, ClientSummary } from "@/types/client";
import { apiError, type ApiResult } from "./errors";
import { apiRequest } from "./http";

// Clients, through the backend's /staff/clients/ endpoints, with the signed-in staff member's token.

export const CLIENTS_PAGE_SIZE = 10;

const optional = z
  .string()
  .nullable()
  .transform((value) => value ?? undefined);

const summaryShape = {
  id: z.string(),
  fullName: z.string(),
  businessName: optional,
  email: z.string(),
  planName: z.string().nullable(),
  planStatus: z.enum(["active", "cancelled", "none"]),
  joinedOn: z.string(),
};
const summarySchema: z.ZodType<ClientSummary> = z.object(summaryShape);
const detailSchema: z.ZodType<ClientDetail> = z.object({
  ...summaryShape,
  signInMethod: z.enum(["password", "google"]),
  history: z.array(z.object({ id: z.string(), at: z.string(), text: z.string(), by: z.string() })),
});
const pageSchema: z.ZodType<ClientPage> = z.object({
  items: z.array(summarySchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
const noContent = z.unknown().transform(() => null);

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/** Client ids are whole numbers; anything else can't be a client, so it isn't sent to the backend. */
export const isClientId = (id: string) => /^\d{1,18}$/.test(id);
const notFound = (): ApiResult<never> => ({ ok: false, error: apiError("NOT_FOUND", 404) });

/** Searches by name, business or email, newest clients first. */
export function searchClients(token: string, { query, page, withoutPlan = false }: ClientSearch): Promise<ApiResult<ClientPage>> {
  const params = new URLSearchParams({ page: String(Math.max(1, page)), pageSize: String(CLIENTS_PAGE_SIZE) });
  if (query) params.set("q", query);
  if (withoutPlan) params.set("withoutPlan", "true");
  return apiRequest(`/staff/clients/?${params}`, { schema: pageSchema, headers: bearer(token) });
}

/** One client, with their history. The backend records that staff opened it. */
export async function getClient(token: string, id: string): Promise<ApiResult<ClientDetail>> {
  if (!isClientId(id)) return notFound();
  return apiRequest(`/staff/clients/${id}/`, { schema: detailSchema, headers: bearer(token) });
}

/** Emails the client a link to set a new password. Refused for clients who only use Google. */
export async function sendPasswordReset(token: string, id: string): Promise<ApiResult<null>> {
  if (!isClientId(id)) return notFound();
  return apiRequest(`/staff/clients/${id}/password-reset/`, { method: "POST", schema: noContent, headers: bearer(token) });
}
