"use server";

import { redirect } from "next/navigation";
import { sendPasswordReset } from "@/lib/api/clients";
import { requireStaff } from "@/lib/auth";

// Form actions can be called directly with a POST, so each one checks the session itself.

export async function sendPasswordResetAction(form: FormData): Promise<void> {
  const { token } = await requireStaff();
  const id = String(form.get("clientId") ?? "");
  if (!id) redirect("/clients");

  let sent = false;
  try {
    sent = (await sendPasswordReset(token, id)).ok;
  } catch (error) {
    console.error("[clients] password reset failed", error instanceof Error ? error.name : "");
  }
  redirect(`/clients/${encodeURIComponent(id)}?reset=${sent ? "sent" : "failed"}`);
}
