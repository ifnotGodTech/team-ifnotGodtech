"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { INITIAL_CHOICE_STATE, type ChoiceFormState } from "@/lib/actions/formState";

/**
 * Runs a form action without React clearing the form afterwards, so ticked boxes stay as they
 * were when a save fails. Without JavaScript the form posts to the same action as usual.
 */
export function useKeptFormAction(action: (state: ChoiceFormState, form: FormData) => Promise<ChoiceFormState>) {
  const [state, formAction, pending] = useActionState(action, INITIAL_CHOICE_STATE);
  const [, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };

  return { state, formAction, pending, onSubmit };
}
