import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { readStaffSession } from "@/lib/auth";
import { logInAction } from "@/lib/auth/actions";
import { safeNextPath } from "@/lib/auth/paths";
import { usingStandIn } from "@/lib/api";

export const metadata: Metadata = { title: "Log in" };

const NOTICES = {
  expired: "Your session ended after an hour without activity. Please log in again.",
  "signed-out": "You've logged out.",
  "too-many-codes": "Too many wrong codes. Please log in again.",
} as const;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, reason } = await searchParams;
  const destination = safeNextPath(next);
  if ((await readStaffSession()).status === "active") redirect(destination);

  const notice = typeof reason === "string" && reason in NOTICES ? NOTICES[reason as keyof typeof NOTICES] : null;
  return <LoginForm action={logInAction} next={destination} notice={notice} standIn={usingStandIn()} />;
}
