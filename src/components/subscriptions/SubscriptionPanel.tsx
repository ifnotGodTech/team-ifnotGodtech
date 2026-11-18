import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmPanel } from "@/components/ui/ConfirmPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cancelSubscriptionAction, keepSubscriptionAction } from "@/lib/actions/subscriptions";
import { formatLongDate, formatNaira, formatShortDate } from "@/shared/format";
import { paidLabel, serviceChoices } from "@/shared/subscriptions";
import type { Catalogue } from "@/types/catalogue";
import type { ClientSubscription } from "@/types/subscription";

type SubscriptionPanelProps = {
  clientId: string;
  clientName: string;
  subscription: ClientSubscription;
  catalogue: Catalogue;
};

const CARD = "flex flex-col gap-4.5 rounded-[10px] border border-line bg-card p-6";

function Detail({ term, children }: { term: string; children: string }) {
  return (
    <div>
      <dt className="font-semibold">{term}</dt>
      <dd className="text-text-dim">{children}</dd>
    </div>
  );
}

export function SubscriptionPanel({ clientId, clientName, subscription, catalogue }: SubscriptionPanelProps) {
  const plan = catalogue.plans.find((item) => item.id === subscription.planId);
  const pendingPlan = catalogue.plans.find((item) => item.id === subscription.pendingPlanId);
  if (!plan) return null;

  const { status, currentPeriodEnd, reminder } = subscription;
  const endDate = formatLongDate(currentPeriodEnd);
  const choices = serviceChoices(plan, catalogue, subscription.serviceIds);
  const servicesById = new Map(catalogue.services.map((service) => [service.id, service]));

  return (
    <>
      {subscription.paymentDue && (
        <p role="note" className="rounded-[10px] border border-orange bg-warning-bg px-5 py-4">
          <strong>Renewal payment not received yet.</strong>{" "}
          {subscription.paymentDue.amount !== null && `${formatNaira(subscription.paymentDue.amount)} is due. `}
          The client has been emailed a link to pay. Everything keeps working until{" "}
          {formatLongDate(subscription.paymentDue.workingUntil)}; if it&apos;s still unpaid, the plan ends.
        </p>
      )}

      {status === "cancelled" && (
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-[10px] border border-orange bg-warning-bg px-5 py-4">
          <p>
            <strong>Subscription cancelled.</strong> Everything keeps working until {endDate}, then the automations stop. The client keeps their website.
          </p>
          <form action={keepSubscriptionAction}>
            <input type="hidden" name="clientId" value={clientId} />
            <Button type="submit">Keep the plan</Button>
          </form>
        </div>
      )}

      <section aria-labelledby="plan-heading" className={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2.5">
          <div className="flex flex-col gap-0.5">
            <h2 id="plan-heading" className="text-[1.4rem] font-extrabold">
              {plan.name} plan
            </h2>
            <p className="text-text-dim">
              {plan.monthlyPrice === null ? "Price agreed with the client" : `${formatNaira(plan.monthlyPrice)} a month`}, {paidLabel(subscription.billingPeriod)}
            </p>
          </div>
          {status === "active" && <StatusBadge tone="success">Active</StatusBadge>}
          {status === "cancelled" && <StatusBadge tone="warning">{`Ends ${formatShortDate(currentPeriodEnd)}`}</StatusBadge>}
          {status === "ended" && <StatusBadge tone="neutral">Ended</StatusBadge>}
        </div>

        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-6 gap-y-3.5">
          <Detail term={status === "active" ? "Renews automatically" : status === "cancelled" ? "Access ends" : "Ended on"}>{endDate}</Detail>
          <Detail term="Renewal reminder">
            {!reminder ? "None, the plan won't renew" : reminder.sentOn ? `Emailed ${formatShortDate(reminder.sentOn)}` : `Emails on ${formatShortDate(reminder.dueOn)}`}
          </Detail>
          <Detail term="Changes left this month">
            {typeof plan.monthlyChanges === "number" ? `${subscription.changesLeftThisMonth} of ${plan.monthlyChanges}` : `${subscription.changesLeftThisMonth}, as agreed`}
          </Detail>
          <Detail term="Setup fee">
            {subscription.setupFeePaidOn ? `Paid ${formatShortDate(subscription.setupFeePaidOn)}` : "Waived for paying upfront"}
          </Detail>
          {pendingPlan && status === "active" && (
            <Detail term="Plan change">{`Moves to ${pendingPlan.name} on ${endDate}. Nothing to pay until then.`}</Detail>
          )}
        </dl>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-x-6 gap-y-4 border-t border-line-soft pt-4">
          {choices.map((choice) => {
            const chosen = subscription.serviceIds.filter((id) => servicesById.get(id)?.group === choice.group.id);
            return (
              <div key={choice.group.id}>
                <h3 className="font-extrabold">{choice.label}</h3>
                {chosen.length === 0 ? (
                  <p className="mt-1.5 text-text-dim">None chosen yet</p>
                ) : (
                  <ul className="mt-1.5 list-disc pl-5">
                    {chosen.map((id) => (
                      <li key={id}>
                        {servicesById.get(id)?.name}
                        {servicesById.get(id)?.available === false && <span className="text-text-dim"> (taken off the website, still running)</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {status === "active" && (
          <div className="flex flex-wrap items-start gap-2.5">
            <ButtonLink href={`/clients/${clientId}/services`} variant="secondary">
              Change services
            </ButtonLink>
            <ButtonLink href={`/clients/${clientId}/plan`} variant="secondary">
              Change plan
            </ButtonLink>
            <ConfirmPanel
              triggerLabel="Cancel subscription"
              title={`Cancel ${clientName}'s ${plan.name} plan?`}
              confirmLabel="Yes, cancel the subscription"
              action={cancelSubscriptionAction}
              fields={{ clientId }}
            >
              <ul className="list-disc pl-5">
                <li>Everything keeps working until {endDate}, and the plan won&apos;t renew.</li>
                {pendingPlan && <li>The waiting change to {pendingPlan.name} won&apos;t happen.</li>}
                <li>After that, the automations stop. The client keeps their website.</li>
                <li>No refund is due. The client is emailed to confirm the cancellation.</li>
              </ul>
            </ConfirmPanel>
          </div>
        )}
      </section>
    </>
  );
}
