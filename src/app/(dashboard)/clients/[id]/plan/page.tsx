import type { Metadata } from "next";
import { ChangePageFrame } from "@/components/subscriptions/ChangePageFrame";
import { PlanForm } from "@/components/subscriptions/PlanForm";
import { changePlanAction } from "@/lib/actions/subscriptions";
import { requireStaff } from "@/lib/auth";
import { loadSubscription } from "@/lib/loaders/subscription";
import { formatLongDate } from "@/shared/format";
import { pricedPlans } from "@/shared/subscriptions";

export const metadata: Metadata = { title: "Change plan" };

export default async function ChangePlanPage({ params }: PageProps<"/clients/[id]/plan">) {
  await requireStaff();
  const loaded = await loadSubscription((await params).id);

  return (
    <ChangePageFrame loaded={loaded} title="Change plan">
      {(client, subscription) =>
        loaded.ok && (
          <>
            <PlanForm
              action={changePlanAction}
              clientId={client.id}
              plans={pricedPlans(loaded.catalogue)}
              currentPlanId={subscription.planId}
              pendingPlanId={subscription.pendingPlanId}
              renewalDate={formatLongDate(subscription.currentPeriodEnd)}
            />
            <p className="text-[0.94rem] text-text-dim">Custom plans are quoted after an audit, so they can&apos;t be chosen here.</p>
          </>
        )
      }
    </ChangePageFrame>
  );
}
