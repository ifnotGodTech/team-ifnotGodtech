"use client";

import { FormMessages } from "@/components/forms/FormMessages";
import { useKeptFormAction } from "@/components/forms/useKeptFormAction";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { INITIAL_CONTENT_STATE, type ContentFormState } from "@/lib/actions/formState";
import { cn } from "@/shared/cn";
import type { ServiceGroup } from "@/types/catalogue";

type GroupFormProps = {
  action: (state: ContentFormState, form: FormData) => Promise<ContentFormState>;
  /** Null when adding a group. */
  group: ServiceGroup | null;
  /** "8 services · Starter 1, Growth 3, Pro 6". */
  summary?: string;
};

export function GroupForm({ action, group, summary }: GroupFormProps) {
  const { state, formAction, pending, onSubmit } = useKeptFormAction(action, INITIAL_CONTENT_STATE);
  const errors = state.fieldErrors;
  const prefix = group?.id ?? "new-group";

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      aria-label={group ? group.name : "Add a group"}
      className={cn("flex flex-col gap-3.5 rounded-[10px] bg-card p-5.5", group ? "border border-line" : "max-w-3xl border-2 border-maroon")}
    >
      {group ? <input type="hidden" name="id" value={group.id} /> : <h2 className="text-[1.25rem] font-extrabold">Add a group</h2>}
      <FormField id={`${prefix}-name`} label="Name" error={errors.name}>
        {(props) => <input {...props} name="name" defaultValue={group?.name} />}
      </FormField>
      <FormField id={`${prefix}-one`} label="One of them is called" error={errors.unitSingular} hint={group ? undefined : 'Such as "website or app", as in "1 website or app".'}>
        {(props) => <input {...props} name="unitSingular" defaultValue={group?.unitSingular} />}
      </FormField>
      <FormField id={`${prefix}-many`} label="Several are called" error={errors.unitPlural} hint={group ? undefined : 'Such as "websites or apps", as in "2 websites or apps".'}>
        {(props) => <input {...props} name="unitPlural" defaultValue={group?.unitPlural} />}
      </FormField>
      {summary && <p className="text-[0.88rem] text-text-dim">{summary}</p>}
      {!group && <p className="text-[0.88rem] text-text-dim">The group appears on the website once a plan includes at least one of its services.</p>}
      <FormMessages error={state.formError} notice={state.notice} />
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : group ? "Save" : "Save group"}
        </Button>
        {!group && (
          <ButtonLink href="/content?tab=groups" variant="secondary">
            Go back
          </ButtonLink>
        )}
      </div>
    </form>
  );
}
