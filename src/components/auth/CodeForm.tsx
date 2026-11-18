"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { INITIAL_AUTH_STATE, type AuthFormState } from "@/lib/auth/formState";

type CodeFormProps = {
  verifyAction: (state: AuthFormState, form: FormData) => Promise<AuthFormState>;
  resendAction: (state: AuthFormState) => Promise<AuthFormState>;
  sentTo: string;
};

export function CodeForm({ verifyAction, resendAction, sentTo }: CodeFormProps) {
  const [state, formAction, pending] = useActionState(verifyAction, INITIAL_AUTH_STATE);
  const [resent, resendFormAction, resending] = useActionState(resendAction, INITIAL_AUTH_STATE);
  const message = state.formError ?? resent.formError;

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-paper p-7 text-text">
      <form action={formAction} aria-label="Enter your code" noValidate className="flex flex-col gap-4">
        <p className="text-[0.88rem] font-bold text-text-dim">Step 2 of 2</p>
        <h2 className="text-[1.4rem] font-extrabold">Check your email</h2>
        <p className="text-text-dim">
          We&apos;ve sent a 6-digit code to <strong className="text-text">{sentTo}</strong>. It expires in 10 minutes.
        </p>
        <FormField id="code" label="Code" required error={state.fieldErrors.code}>
          {(props) => (
            <input
              {...props}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className={`${props.className} text-center text-2xl font-bold tracking-[0.3em]`}
            />
          )}
        </FormField>
        <p role="alert" aria-live="assertive" className="font-semibold text-maroon empty:hidden">
          {message}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Checking…" : "Log in"}
        </Button>
      </form>

      <p role="status" aria-live="polite" className="font-semibold text-success empty:hidden">
        {resent.notice}
      </p>
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-2 text-[0.94rem]">
        <form action={resendFormAction}>
          <button type="submit" disabled={resending} className="cursor-pointer font-semibold text-maroon underline disabled:opacity-60">
            {resending ? "Sending…" : "Send a new code"}
          </button>
        </form>
        <Link href="/login" className="font-semibold text-maroon underline">
          Use a different account
        </Link>
      </div>
    </div>
  );
}
