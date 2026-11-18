"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ApiResult } from "@/lib/api/errors";
import * as content from "@/lib/api/content";
import { requireStaff } from "@/lib/auth";
import { fieldErrorsOf, groupSchema, planSchema, serviceSchema, siteTextSchema, WHEN_LIVE } from "@/shared/content";
import { formatNaira } from "@/shared/format";
import type { ContentFormState } from "./formState";

// Site content changes. Form actions can be called directly with a POST, so each one checks the
// session and validates its input itself. The backend has the final say.

const UNREACHABLE = "The dashboard can't reach the server right now. Please try again in a moment.";
const CHECK_FIELDS = "Check the highlighted fields.";
const idSchema = z.string().regex(/^[a-z0-9-]{1,64}$/);

const invalid = (fieldErrors: Record<string, string>): ContentFormState => ({ formError: CHECK_FIELDS, fieldErrors, notice: null });

async function call<T>(run: () => Promise<ApiResult<T>>): Promise<ApiResult<T> | null> {
  try {
    return await run();
  } catch (error) {
    console.error("[content] backend call failed", error instanceof Error ? error.name : "");
    return null;
  }
}

/** The form state for a failed save: the backend's message and field errors, or a plain message. */
function failed(result: ApiResult<unknown> | null): ContentFormState {
  if (!result) return { formError: UNREACHABLE, fieldErrors: {}, notice: null };
  if (result.ok) return { formError: null, fieldErrors: {}, notice: null };
  return { formError: result.error.message, fieldErrors: result.error.fieldErrors, notice: null };
}

const optionalId = (value: FormDataEntryValue | null) => {
  const parsed = idSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export async function savePlanAction(_: ContentFormState, form: FormData): Promise<ContentFormState> {
  const { token } = await requireStaff();
  const planId = z.enum(["starter", "growth", "pro"]).safeParse(form.get("planId"));
  if (!planId.success) return { formError: "That plan can't be edited here.", fieldErrors: {}, notice: null };

  const allowances = Object.fromEntries(
    [...form.keys()].filter((key) => key.startsWith("allowance.")).map((key) => [key.slice("allowance.".length), String(form.get(key) ?? "")])
  );
  const parsed = planSchema.safeParse({
    monthlyPrice: String(form.get("monthlyPrice") ?? ""),
    monthlyChanges: String(form.get("monthlyChanges") ?? ""),
    allowances,
    lines: form.getAll("line").map(String),
    recommended: form.get("recommended") === "on",
  });
  if (!parsed.success) return invalid(fieldErrorsOf(parsed.error));

  const result = await call(() => content.savePlan(token, planId.data, parsed.data));
  if (!result?.ok) return failed(result);

  revalidatePath("/content");
  const priceChanged = Number(form.get("previousPrice")) !== parsed.data.monthlyPrice;
  return {
    formError: null,
    fieldErrors: {},
    notice: priceChanged
      ? `Saved. ${WHEN_LIVE} New subscribers pay ${formatNaira(parsed.data.monthlyPrice)} straight away, and existing subscribers from their next renewal.`
      : `Saved. ${WHEN_LIVE}`,
  };
}

export async function saveServiceAction(_: ContentFormState, form: FormData): Promise<ContentFormState> {
  const { token } = await requireStaff();
  const parsed = serviceSchema.safeParse({
    id: optionalId(form.get("id")),
    name: String(form.get("name") ?? ""),
    problem: String(form.get("problem") ?? ""),
    group: String(form.get("group") ?? ""),
    plans: form.getAll("plans").map(String),
  });
  if (!parsed.success) return invalid(fieldErrorsOf(parsed.error));

  const result = await call(() => content.saveService(token, parsed.data));
  if (!result?.ok) return failed(result);
  redirect(`/content?tab=services&saved=${parsed.data.id ? "service" : "new-service"}`);
}

export async function setServiceShownAction(form: FormData): Promise<void> {
  const { token } = await requireStaff();
  const id = optionalId(form.get("serviceId"));
  if (!id) redirect("/content?tab=services");
  const shown = form.get("shown") === "true";

  const result = await call(() => content.setServiceShown(token, id, shown));
  redirect(`/content?tab=services&saved=${result?.ok ? (shown ? "shown" : "hidden") : "failed"}`);
}

export async function saveGroupAction(_: ContentFormState, form: FormData): Promise<ContentFormState> {
  const { token } = await requireStaff();
  const parsed = groupSchema.safeParse({
    id: optionalId(form.get("id")),
    name: String(form.get("name") ?? ""),
    unitSingular: String(form.get("unitSingular") ?? ""),
    unitPlural: String(form.get("unitPlural") ?? ""),
  });
  if (!parsed.success) return invalid(fieldErrorsOf(parsed.error));

  const result = await call(() => content.saveGroup(token, parsed.data));
  if (!result?.ok) return failed(result);
  if (!parsed.data.id) redirect("/content?tab=groups&saved=new-group");
  revalidatePath("/content");
  return { formError: null, fieldErrors: {}, notice: `Saved. ${WHEN_LIVE}` };
}

export async function saveSiteTextAction(_: ContentFormState, form: FormData): Promise<ContentFormState> {
  const { token } = await requireStaff();
  const parsed = siteTextSchema.safeParse({
    headline: String(form.get("headline") ?? ""),
    introduction: String(form.get("introduction") ?? ""),
    closingCallToAction: String(form.get("closingCallToAction") ?? ""),
  });
  if (!parsed.success) return invalid(fieldErrorsOf(parsed.error));

  const result = await call(() => content.saveSiteText(token, parsed.data));
  if (!result?.ok) return failed(result);
  revalidatePath("/content");
  return { formError: null, fieldErrors: {}, notice: `Saved. ${WHEN_LIVE}` };
}
