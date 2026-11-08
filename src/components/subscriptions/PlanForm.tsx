"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { ChoiceFormState } from "@/lib/actions/formState";
import { useKeptFormAction } from "./useKeptFormAction";
import { formatNaira } from "@/shared/format";
import type { Plan, PlanId } from "@/types/catalogue";

type PlanFormProps = {
  action: (state: ChoiceFormState, form: FormData) => Promise<ChoiceFormState>;
  clientId: string;
  plans: Plan[];
  currentPlanId: PlanId;
  pendingPlanId: PlanId | null;
  /** "10 November 2026": when a change would start. */
  renewalDate: string;
};

export function PlanForm({ action, clientId, plans, currentPlanId, pendingPlanId, renewalDate }: PlanFormProps) {
  const { state, formAction, pending, onSubmit } = useKeptFormAction(action);
  const [selected, setSelected] = useState<string>(pendingPlanId ?? currentPlanId);
  const chosen = plans.find((plan) => plan.id === selected);

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-5 rounded-[10px] border border-line bg-card p-6">
      <input type="hidden" name="clientId" value={clientId} />
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 font-extrabold">Plan from the next renewal</legend>
        {plans.map((plan) => (
          <label key={plan.id} className="flex items-start gap-2.5">
            <input
              type="radio"
              name="plan"
              value={plan.id}
              checked={selected === plan.id}
              onChange={() => setSelected(plan.id)}
              className="mt-1.5 size-4 accent-maroon"
            />
            <span>
              <span className="font-semibold">{plan.name}</span>, {formatNaira(plan.monthlyPrice ?? 0)} a month
              {plan.id === currentPlanId && <span className="text-text-dim"> (current plan)</span>}
            </span>
          </label>
        ))}
      </fieldset>

      <p aria-live="polite" className="text-text-dim">
        {selected === currentPlanId
          ? pendingPlanId
            ? `Keeps ${chosen?.name} and drops the waiting change.`
            : `${chosen?.name} is the current plan, so nothing changes.`
          : `${chosen?.name} starts at the next renewal, on ${renewalDate}. Nothing is charged today, and the current plan keeps working until then.`}
      </p>
      <p role="alert" className="font-semibold text-maroon empty:hidden">
        {state.formError}
      </p>
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save plan change"}
        </Button>
        <ButtonLink href={`/clients/${clientId}`} variant="secondary">
          Go back
        </ButtonLink>
      </div>
    </form>
  );
}
