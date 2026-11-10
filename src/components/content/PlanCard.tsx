"use client";

import { useState } from "react";
import { useKeptFormAction } from "@/components/forms/useKeptFormAction";
import { FormMessages } from "@/components/forms/FormMessages";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { INITIAL_CONTENT_STATE, type ContentFormState } from "@/lib/actions/formState";
import { MAX_PLAN_LINES, PRICE_RULE } from "@/shared/content";
import type { Plan, ServiceGroup } from "@/types/catalogue";

type PlanCardProps = {
  action: (state: ContentFormState, form: FormData) => Promise<ContentFormState>;
  plan: Plan;
  groups: ServiceGroup[];
};

const SMALL_LINK = "cursor-pointer px-0.5 py-1 text-[0.88rem] font-semibold text-maroon underline disabled:cursor-default disabled:text-text-dim disabled:no-underline";

export function PlanCard({ action, plan, groups }: PlanCardProps) {
  const { state, formAction, pending, onSubmit } = useKeptFormAction(action, INITIAL_CONTENT_STATE);
  const [lines, setLines] = useState(plan.lines);
  const [newLine, setNewLine] = useState("");
  const errors = state.fieldErrors;
  const id = (field: string) => `${plan.id}-${field}`;

  const move = (from: number, to: number) =>
    setLines((items) => {
      const next = [...items];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  const addLine = () => {
    if (!newLine.trim() || lines.length >= MAX_PLAN_LINES) return;
    setLines((items) => [...items, newLine.trim()]);
    setNewLine("");
  };

  return (
    <form action={formAction} onSubmit={onSubmit} aria-labelledby={id("heading")} className="flex flex-col gap-3.5 rounded-[10px] border border-line bg-card p-5.5">
      <input type="hidden" name="planId" value={plan.id} />
      <input type="hidden" name="previousPrice" value={plan.monthlyPrice ?? ""} />
      <h2 id={id("heading")} className="text-[1.25rem] font-extrabold">
        {plan.name}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <FormField id={id("price")} label="Monthly price (₦)" error={errors.monthlyPrice}>
          {(props) => <input {...props} name="monthlyPrice" inputMode="numeric" defaultValue={plan.monthlyPrice === null ? "" : plan.monthlyPrice.toLocaleString("en-NG")} />}
        </FormField>
        <FormField id={id("changes")} label="Changes a month" error={errors.monthlyChanges}>
          {(props) => <input {...props} name="monthlyChanges" inputMode="numeric" defaultValue={String(plan.monthlyChanges)} />}
        </FormField>
      </div>

      <fieldset className="flex flex-col gap-2 border-t border-line-soft pt-3">
        <legend className="float-left mb-1.5 w-full font-bold">Services included from each group</legend>
        {groups.map((group) => {
          const error = errors[`allowances.${group.id}`];
          return (
            <div key={group.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={id(`allow-${group.id}`)}>{group.name}</label>
                <input
                  id={id(`allow-${group.id}`)}
                  name={`allowance.${group.id}`}
                  inputMode="numeric"
                  defaultValue={String(plan.allowances[group.id] ?? 0)}
                  aria-invalid={error ? true : undefined}
                  className="min-h-11 w-18 rounded-md border border-field bg-card px-2 text-center text-base"
                />
              </div>
              {error && <span className="text-[0.88rem] font-semibold text-maroon">{error}</span>}
            </div>
          );
        })}
      </fieldset>

      <div className="flex flex-col gap-2 border-t border-line-soft pt-3">
        <h3 className="font-bold">Other things this plan lists</h3>
        <p id={id("lines-hint")} className="text-[0.88rem] text-text-dim">
          The first line is the website we build for the client: Pricing labels it &ldquo;Website we build&rdquo;, so keep it first.
        </p>
        {lines.length === 0 ? (
          <p className="text-text-dim">Nothing else yet.</p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {lines.map((line, index) => (
              <li key={`${line}-${index}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-paper px-2.5 py-2">
                <input type="hidden" name="line" value={line} />
                <span className="min-w-0 grow basis-40">{line}</span>
                <span className="flex gap-1">
                  <button type="button" className={SMALL_LINK} disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={`Move ${line} up`}>
                    Up
                  </button>
                  <button type="button" className={SMALL_LINK} disabled={index === lines.length - 1} onClick={() => move(index, index + 1)} aria-label={`Move ${line} down`}>
                    Down
                  </button>
                  <button type="button" className={SMALL_LINK} onClick={() => setLines((items) => items.filter((_, i) => i !== index))} aria-label={`Remove ${line}`}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
        {Object.entries(errors)
          .filter(([key]) => key.startsWith("lines"))
          .slice(0, 1)
          .map(([key, message]) => (
            <span key={key} className="text-[0.88rem] font-semibold text-maroon">
              {message}
            </span>
          ))}
        <div className="flex items-end gap-2">
          <div className="grow">
            <label htmlFor={id("new-line")} className="text-[0.94rem] font-semibold">
              Add a line
            </label>
            <input
              id={id("new-line")}
              value={newLine}
              maxLength={80}
              placeholder="For example, Monthly strategy call"
              onChange={(event) => setNewLine(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addLine();
                }
              }}
              className="mt-1.5 min-h-11 w-full rounded-md border border-field bg-card px-3 text-base"
            />
          </div>
          <Button variant="secondary" onClick={addLine} disabled={lines.length >= MAX_PLAN_LINES}>
            Add
          </Button>
        </div>
        <p className="text-[0.88rem] text-text-dim">The website lists the services and changes above first, then these lines in this order.</p>
      </div>

      <label className="flex items-center gap-2.5 font-semibold">
        {/* Re-mounts when "recommended" moves to another plan after a save, so every card shows it. */}
        <input key={String(plan.recommended)} type="checkbox" name="recommended" defaultChecked={plan.recommended} className="size-5 accent-maroon" />
        Show as recommended
      </label>
      <p className="text-[0.88rem] text-text-dim">{PRICE_RULE}</p>
      <FormMessages error={state.formError} notice={state.notice} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : `Save ${plan.name}`}
      </Button>
    </form>
  );
}
