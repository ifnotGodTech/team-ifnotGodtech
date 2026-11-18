"use client";

import { FormMessages } from "@/components/forms/FormMessages";
import { useKeptFormAction } from "@/components/forms/useKeptFormAction";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { INITIAL_CONTENT_STATE, type ContentFormState } from "@/lib/actions/formState";
import { BILLING_RULE } from "@/shared/content";
import type { BillingTerms } from "@/types/catalogue";

type BillingTermsFormProps = {
  action: (state: ContentFormState, form: FormData) => Promise<ContentFormState>;
  terms: BillingTerms;
};

/** The setup fee and upfront offers: one set for every plan. */
export function BillingTermsForm({ action, terms }: BillingTermsFormProps) {
  const { state, formAction, pending, onSubmit } = useKeptFormAction(action, INITIAL_CONTENT_STATE);
  const errors = state.fieldErrors;

  return (
    <form action={formAction} onSubmit={onSubmit} aria-label="Setup fee and offers" className="flex max-w-xl flex-col gap-4 rounded-[10px] border border-line bg-card p-5.5">
      <FormField id="setupFee" label="Setup fee (₦)" error={errors.setupFee} hint="Charged once, on a client's first subscription. Enter 0 for no setup fee.">
        {(props) => <input {...props} inputMode="numeric" defaultValue={terms.setupFee.toLocaleString("en-NG")} />}
      </FormField>
      <FormField id="setupFeeWaivedFromMonths" label="No setup fee when paying upfront for" error={errors.setupFeeWaivedFromMonths}>
        {(props) => (
          <select {...props} defaultValue={String(terms.setupFeeWaivedFromMonths)}>
            <option value="6">6 or 12 months</option>
            <option value="12">12 months only</option>
          </select>
        )}
      </FormField>
      <FormField id="freeMonthsOnTwelve" label="Months free when paying 12 months upfront" error={errors.freeMonthsOnTwelve} hint="Enter 0 for none.">
        {(props) => <input {...props} inputMode="numeric" defaultValue={String(terms.freeMonthsOnTwelve)} />}
      </FormField>
      <p className="text-[0.88rem] text-text-dim">{BILLING_RULE}</p>
      <FormMessages error={state.formError} notice={state.notice} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save setup fee and offers"}
      </Button>
    </form>
  );
}
