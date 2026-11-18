"use client";

import { FormMessages } from "@/components/forms/FormMessages";
import { useKeptFormAction } from "@/components/forms/useKeptFormAction";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { INITIAL_CONTENT_STATE, type ContentFormState } from "@/lib/actions/formState";
import type { SiteText } from "@/types/catalogue";

type SiteTextFormProps = { action: (state: ContentFormState, form: FormData) => Promise<ContentFormState>; text: SiteText };

export function SiteTextForm({ action, text }: SiteTextFormProps) {
  const { state, formAction, pending, onSubmit } = useKeptFormAction(action, INITIAL_CONTENT_STATE);
  const errors = state.fieldErrors;

  return (
    <form action={formAction} onSubmit={onSubmit} aria-label="Site text" className="flex max-w-3xl flex-col gap-4 rounded-[10px] border border-line bg-card p-5.5">
      <FormField id="headline" label="Home page headline" error={errors.headline} defaultValue={text.headline} />
      <FormField id="introduction" label="Home page introduction" error={errors.introduction}>
        {(props) => <textarea {...props} rows={3} defaultValue={text.introduction} />}
      </FormField>
      <FormField id="closingCallToAction" label="Closing call to action" error={errors.closingCallToAction} defaultValue={text.closingCallToAction} />
      <FormMessages error={state.formError} notice={state.notice} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save site text"}
      </Button>
    </form>
  );
}
