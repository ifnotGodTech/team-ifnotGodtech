import type { Metadata } from "next";
import { ChangePageFrame } from "@/components/subscriptions/ChangePageFrame";
import { ServicesForm } from "@/components/subscriptions/ServicesForm";
import { updateServicesAction } from "@/lib/actions/subscriptions";
import { requireStaff } from "@/lib/auth";
import { loadSubscription } from "@/lib/loaders/subscription";
import { serviceChoices } from "@/shared/subscriptions";

export const metadata: Metadata = { title: "Change services" };

export default async function ChangeServicesPage({ params }: PageProps<"/clients/[id]/services">) {
  const { token } = await requireStaff();
  const loaded = await loadSubscription(token, (await params).id);

  return (
    <ChangePageFrame loaded={loaded} title="Change services">
      {(client, subscription) => {
        const plan = loaded.ok ? loaded.catalogue.plans.find((item) => item.id === subscription.planId) : undefined;
        if (!plan || !loaded.ok) return null;
        return (
          <ServicesForm
            action={updateServicesAction}
            clientId={client.id}
            choices={serviceChoices(plan, loaded.catalogue, subscription.serviceIds)}
            current={subscription.serviceIds}
            changesLeft={subscription.changesLeftThisMonth}
          />
        );
      }}
    </ChangePageFrame>
  );
}
