"use client";

import { useState, type FormEvent } from "react";
import { FormMessages } from "@/components/forms/FormMessages";
import { useKeptFormAction } from "@/components/forms/useKeptFormAction";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { INITIAL_CONTENT_STATE, type ContentFormState } from "@/lib/actions/formState";
import { BILLING_RULE, billingTermsSchema, describeBillingTerms, PAYMENT_OPTIONS } from "@/shared/content";
import type { BillingTerms } from "@/types/catalogue";

type BillingTermsFormProps = {
  action: (state: ContentFormState, form: FormData) => Promise<ContentFormState>;
  terms: BillingTerms;
};

const FIELDS = ["setupFee", ...PAYMENT_OPTIONS.flatMap((option) => [option.waiver, ...(option.freeMonths ? [option.freeMonths] : [])])];

/** What the form holds now, as terms, or null while something typed isn't valid yet. */
function termsOf(form: HTMLFormElement): BillingTerms | null {
  const data = new FormData(form);
  const parsed = billingTermsSchema.safeParse(Object.fromEntries(FIELDS.map((field) => [field, String(data.get(field) ?? "")])));
  return parsed.success ? parsed.data : null;
}

/** The setup fee, and for each way of paying whether it's waived and the months free. One set for every plan. */
export function BillingTermsForm({ action, terms }: BillingTermsFormProps) {
  const { state, formAction, pending, onSubmit } = useKeptFormAction(action, INITIAL_CONTENT_STATE);
  const errors = state.fieldErrors;
  const [preview, setPreview] = useState<BillingTerms | null>(terms);

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      onChange={(event: FormEvent<HTMLFormElement>) => setPreview(termsOf(event.currentTarget))}
      aria-label="Setup fee and offers"
      className="flex max-w-2xl flex-col gap-5 rounded-[10px] border border-line bg-card p-5.5"
    >
      <FormField id="setupFee" label="Setup fee (₦)" error={errors.setupFee} hint="Charged once, on a client's first subscription, unless it's waived for how they pay. Enter 0 for no setup fee.">
        {(props) => <input {...props} inputMode="numeric" defaultValue={terms.setupFee.toLocaleString("en-NG")} />}
      </FormField>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">For each way of paying</legend>
        {PAYMENT_OPTIONS.map((option) => (
          <div key={option.label} className="grid grid-cols-1 gap-3 rounded-lg border border-line p-3.5 sm:grid-cols-2" data-testid={`billing-${option.waiver}`}>
            <FormField id={option.waiver} label={`Setup fee, ${option.label.toLowerCase()}`} error={errors[option.waiver]}>
              {(props) => (
                <select {...props} defaultValue={terms[option.waiver] ? "waived" : "charged"}>
                  <option value="charged">Charged</option>
                  <option value="waived">Waived</option>
                </select>
              )}
            </FormField>
            {option.freeMonths ? (
              <FormField
                id={option.freeMonths}
                label={`Months free, ${option.label.toLowerCase()}`}
                error={errors[option.freeMonths]}
                hint={`0 to ${option.maxFreeMonths}.`}
              >
                {(props) => <input {...props} inputMode="numeric" defaultValue={String(terms[option.freeMonths])} />}
              </FormField>
            ) : (
              <p className="self-end text-[0.88rem] text-text-dim">No free months on monthly: the first payment saves the card for renewals.</p>
            )}
          </div>
        ))}
      </fieldset>

      <div className="rounded-lg bg-maroon-tint p-3.5" aria-live="polite">
        <p className="mb-1.5 font-semibold">What new clients will see</p>
        {preview ? (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[0.92rem]">
            {describeBillingTerms(preview).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[0.92rem] text-text-dim">Finish the values above to see the offer.</p>
        )}
      </div>

      <p className="text-[0.88rem] text-text-dim">{BILLING_RULE}</p>
      <FormMessages error={state.formError} notice={state.notice} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save setup fee and offers"}
      </Button>
    </form>
  );
}
