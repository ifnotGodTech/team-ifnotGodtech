"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useKeptFormAction } from "@/components/forms/useKeptFormAction";
import { INITIAL_CHOICE_STATE, type ChoiceFormState } from "@/lib/actions/formState";
import { checkServiceSelection, type ServiceChoice } from "@/shared/subscriptions";

type ServicesFormProps = {
  action: (state: ChoiceFormState, form: FormData) => Promise<ChoiceFormState>;
  clientId: string;
  choices: ServiceChoice[];
  current: string[];
  changesLeft: number;
};

/** Says, as boxes are ticked, how many of the month's changes a selection would use. */
function changesNote(choices: ServiceChoice[], current: string[], selected: string[], changesLeft: number): string {
  const check = checkServiceSelection(choices, current, selected, changesLeft);
  const left = changesLeft === 0 ? "no changes left this month" : `${changesLeft} ${changesLeft === 1 ? "change" : "changes"} left this month`;
  if (current.length === 0) return "Choosing services for the first time doesn't use a change.";
  if (!check.ok && check.reason === "too-many") return `That's more ${check.group!.unitPlural} than the plan includes.`;
  if (!check.ok && check.reason === "no-changes-left") {
    return `This would use ${check.changesUsed} ${check.changesUsed === 1 ? "change" : "changes"}, but the client has ${changesLeft === 0 ? "none" : changesLeft} left this month.`;
  }
  if (check.ok && check.changesUsed > 0) return `This uses ${check.changesUsed} of the client's ${left.replace(" left this month", "")} left this month.`;
  return `Each service added in place of another uses one change. The client has ${left}.`;
}

export function ServicesForm({ action, clientId, choices, current, changesLeft }: ServicesFormProps) {
  const { state, formAction, pending, onSubmit } = useKeptFormAction(action, INITIAL_CHOICE_STATE);
  // Controlled, so what was ticked stays ticked if a save fails.
  const [selected, setSelected] = useState(current);

  const toggle = (id: string, on: boolean) => setSelected((items) => (on ? [...items, id] : items.filter((item) => item !== id)));

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-5 rounded-[10px] border border-line bg-card p-6">
      <input type="hidden" name="clientId" value={clientId} />
      {choices.map((choice) => {
        const picked = choice.services.filter((service) => selected.includes(service.id)).length;
        return (
          <fieldset key={choice.group.id} className="flex flex-col gap-2">
            <legend className="mb-1 font-extrabold">
              {choice.label}
              <span className="ml-2 font-semibold text-text-dim">
                {choice.allowance === "agreed" ? `${picked} chosen` : `${picked} of ${choice.allowance} chosen`}
              </span>
            </legend>
            {choice.services.map((service) => (
              <label key={service.id} className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  name="services"
                  value={service.id}
                  checked={selected.includes(service.id)}
                  onChange={(event) => toggle(service.id, event.target.checked)}
                  className="mt-1.5 size-4 accent-maroon"
                />
                <span>
                  {service.name}
                  {!service.available && <span className="text-text-dim"> (taken off the website; keeps running while chosen)</span>}
                </span>
              </label>
            ))}
          </fieldset>
        );
      })}

      <p aria-live="polite" className="text-text-dim">
        {changesNote(choices, current, selected, changesLeft)}
      </p>
      <p role="alert" className="font-semibold text-maroon empty:hidden">
        {state.formError}
      </p>
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save services"}
        </Button>
        <ButtonLink href={`/clients/${clientId}`} variant="secondary">
          Go back
        </ButtonLink>
      </div>
    </form>
  );
}
