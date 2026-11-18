"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { INITIAL_AUTH_STATE, type AuthFormState } from "@/lib/auth/formState";

type LoginFormProps = {
  action: (state: AuthFormState, form: FormData) => Promise<AuthFormState>;
  next: string;
  notice: string | null;
};

export function LoginForm({ action, next, notice }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_AUTH_STATE);

  return (
    <form action={formAction} aria-label="Log in" noValidate className="flex flex-col gap-4 rounded-xl bg-paper p-7 text-text">
      <p className="text-[0.88rem] font-bold text-text-dim">Step 1 of 2</p>
      {notice && !state.formError && (
        <p role="status" className="rounded-md bg-neutral-bg px-3 py-2 font-semibold">
          {notice}
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <FormField id="email" label="Work email" type="email" autoComplete="username" required error={state.fieldErrors.email} defaultValue={state.values.email} />
      <FormField id="password" label="Password" type="password" autoComplete="current-password" required error={state.fieldErrors.password} />
      <p role="alert" aria-live="assertive" className="font-semibold text-maroon empty:hidden">
        {state.formError}
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Continue"}
      </Button>
      <p className="text-[0.88rem] text-text-dim">Forgotten your password, or need access? Ask whoever manages team accounts.</p>
    </form>
  );
}
