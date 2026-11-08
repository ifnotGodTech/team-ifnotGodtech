"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Runs a form action without React clearing the form afterwards, so what was typed or ticked
 * stays as it was when a save fails. Without JavaScript the form posts to the same action as usual.
 */
export function useKeptFormAction<State extends object>(action: (state: Awaited<State>, form: FormData) => Promise<State>, initial: Awaited<State>) {
  const [state, formAction, pending] = useActionState<State, FormData>(action, initial);
  const [, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };

  return { state, formAction, pending, onSubmit };
}
