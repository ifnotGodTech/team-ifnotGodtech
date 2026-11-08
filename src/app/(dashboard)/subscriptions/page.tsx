import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "Subscriptions" };

export default function SubscriptionsPage() {
  return (
    <>
      <PageHeader title="Subscriptions" />
      <EmptyState title="Nothing to show yet">Subscriptions connects to the backend in phase 4.</EmptyState>
    </>
  );
}
