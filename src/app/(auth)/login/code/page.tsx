import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CodeForm } from "@/components/auth/CodeForm";
import { readPendingLogin, resendCodeAction, verifyCodeAction } from "@/lib/auth/actions";
import { STUB_RULES } from "@/lib/api/stub";
import { usingStandIn } from "@/lib/api";

export const metadata: Metadata = { title: "Enter your code" };

export default async function CodePage() {
  const pending = await readPendingLogin();
  if (!pending) redirect("/login");

  return (
    <CodeForm
      verifyAction={verifyCodeAction}
      resendAction={resendCodeAction}
      sentTo={pending.sentTo}
      standInCode={usingStandIn() ? STUB_RULES.code : null}
    />
  );
}
