"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { setLeadStatus } from "@/lib/api/leads";
import { requireStaff } from "@/lib/auth";
import { isLeadStatus } from "@/shared/leads";

// Form actions can be called directly with a POST, so this checks the session and its input itself.

const idSchema = z.string().regex(/^\d{1,18}$/);

export async function setLeadStatusAction(form: FormData): Promise<void> {
  const { token } = await requireStaff();
  const id = idSchema.safeParse(form.get("leadId"));
  if (!id.success) redirect("/leads");
  const status = form.get("status");
  if (!isLeadStatus(status)) redirect(`/leads/${id.data}`);

  let saved = false;
  try {
    saved = (await setLeadStatus(token, id.data, status)).ok;
  } catch (error) {
    console.error("[leads] status change failed", error instanceof Error ? error.name : "");
  }
  redirect(`/leads/${id.data}?${saved ? `done=${status}` : "failed=status"}`);
}
