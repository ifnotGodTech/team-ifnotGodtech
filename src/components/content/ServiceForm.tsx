"use client";

import { useState } from "react";
import { FormMessages } from "@/components/forms/FormMessages";
import { useKeptFormAction } from "@/components/forms/useKeptFormAction";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { INITIAL_CONTENT_STATE, type ContentFormState } from "@/lib/actions/formState";
import { planGap, removalNote } from "@/shared/content";
import type { Plan, PlanId, Service, ServiceGroup } from "@/types/catalogue";

type ServiceFormProps = {
  action: (state: ContentFormState, form: FormData) => Promise<ContentFormState>;
  /** Null when adding a service. */
  service: Service | null;
  groups: ServiceGroup[];
  /** Starter, Growth and Pro. */
  plans: Plan[];
};

export function ServiceForm({ action, service, groups, plans }: ServiceFormProps) {
  const { state, formAction, pending, onSubmit } = useKeptFormAction(action, INITIAL_CONTENT_STATE);
  const [ticked, setTicked] = useState<PlanId[]>(service?.plans ?? plans.map((plan) => plan.id));
  const errors = state.fieldErrors;
  const gap = planGap(plans, ticked);
  const removal = service ? removalNote(plans, service.plans, ticked) : null;
  const title = service ? `Edit ${service.name}` : "Add a service";

  return (
    <form action={formAction} onSubmit={onSubmit} aria-label={title} className="flex max-w-3xl flex-col gap-4 rounded-[10px] border-2 border-maroon bg-card p-5.5">
      <h2 className="text-[1.25rem] font-extrabold">{title}</h2>
      {service && <input type="hidden" name="id" value={service.id} />}
      <FormField id="name" label="Name" error={errors.name} defaultValue={service?.name} />
      <FormField id="problem" label="The problem it solves, in the client's words" error={errors.problem} hint="Shown on the website under the service's name.">
        {(props) => <textarea {...props} rows={2} defaultValue={service?.problem} />}
      </FormField>
      <FormField id="group" label="Group" error={errors.group}>
        {(props) => (
          <select {...props} defaultValue={service?.group ?? groups[0]?.id}>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <fieldset className="flex flex-col gap-1.5" aria-describedby={errors.plans ? "plans-error" : undefined}>
        <legend className="mb-1 text-[0.94rem] font-semibold">Included in</legend>
        {plans.map((plan) => (
          <label key={plan.id} className="flex items-center gap-2.5 font-semibold">
            <input
              type="checkbox"
              name="plans"
              value={plan.id}
              checked={ticked.includes(plan.id)}
              onChange={(event) => setTicked((items) => (event.target.checked ? [...items, plan.id] : items.filter((item) => item !== plan.id)))}
              className="size-5 accent-maroon"
            />
            {plan.name}
          </label>
        ))}
        <p className="text-[0.88rem] text-text-dim">Custom plans are agreed with each client, so they can include any service.</p>
        {errors.plans && (
          <span id="plans-error" className="text-[0.88rem] font-semibold text-maroon">
            {errors.plans}
          </span>
        )}
      </fieldset>

      {gap && <p className="rounded-lg border border-orange bg-warning-bg px-3.5 py-2.5">{gap}</p>}
      {removal && <p className="rounded-lg border border-line bg-paper px-3.5 py-2.5">{removal}</p>}
      <FormMessages error={state.formError} notice={state.notice} />
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save service"}
        </Button>
        <ButtonLink href="/content?tab=services" variant="secondary">
          Go back
        </ButtonLink>
      </div>
    </form>
  );
}
