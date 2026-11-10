"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import * as subscriptions from "@/lib/api/subscriptions";
import type { ApiResult } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import type { ChoiceFormState } from "./formState";

// Changes on a client's behalf. Form actions can be called directly with a POST, so each one
// checks the session and its input itself. The backend has the final say on the rules.

const clientIdSchema = z.string().regex(/^[\w-]{1,64}$/);
const serviceIdsSchema = z.array(z.string().regex(/^[a-z0-9-]{1,64}$/)).max(50);
const planIdSchema = z.enum(["starter", "growth", "pro"]);

const UNREACHABLE = "The dashboard can't reach the server right now. Please try again in a moment.";

const clientPath = (id: string, query: string) => `/clients/${encodeURIComponent(id)}?${query}`;

async function call<T>(run: () => Promise<ApiResult<T>>): Promise<ApiResult<T> | null> {
  try {
    return await run();
  } catch (error) {
    console.error("[subscriptions] backend call failed", error instanceof Error ? error.name : "");
    return null;
  }
}

function clientIdFrom(form: FormData): string {
  const id = clientIdSchema.safeParse(form.get("clientId"));
  if (!id.success) redirect("/clients");
  return id.data;
}

export async function cancelSubscriptionAction(form: FormData): Promise<void> {
  const { token } = await requireStaff();
  const id = clientIdFrom(form);
  const result = await call(() => subscriptions.cancelSubscription(token, id));
  redirect(clientPath(id, result?.ok ? "done=cancelled" : "failed=cancel"));
}

export async function keepSubscriptionAction(form: FormData): Promise<void> {
  const { token } = await requireStaff();
  const id = clientIdFrom(form);
  const result = await call(() => subscriptions.keepSubscription(token, id));
  redirect(clientPath(id, result?.ok ? "done=kept" : "failed=keep"));
}

export async function updateServicesAction(_: ChoiceFormState, form: FormData): Promise<ChoiceFormState> {
  const { token } = await requireStaff();
  const id = clientIdFrom(form);
  const parsed = serviceIdsSchema.safeParse(form.getAll("services"));
  if (!parsed.success) return { formError: "Some of those services aren't part of this plan.", values: [] };

  const result = await call(() => subscriptions.updateServices(token, id, parsed.data));
  if (!result) return { formError: UNREACHABLE, values: parsed.data };
  if (!result.ok) return { formError: result.error.message, values: parsed.data };
  redirect(clientPath(id, "done=services"));
}

export async function changePlanAction(_: ChoiceFormState, form: FormData): Promise<ChoiceFormState> {
  const { token } = await requireStaff();
  const id = clientIdFrom(form);
  const plan = planIdSchema.safeParse(form.get("plan"));
  if (!plan.success) return { formError: "Choose a plan.", values: [] };

  const result = await call(() => subscriptions.changePlan(token, id, plan.data));
  if (!result) return { formError: UNREACHABLE, values: [plan.data] };
  if (!result.ok) return { formError: result.error.message, values: [plan.data] };
  redirect(clientPath(id, "done=plan"));
}
