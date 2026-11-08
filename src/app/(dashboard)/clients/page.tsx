import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <>
      <PageHeader title="Clients" />
      <EmptyState title="Nothing to show yet">Clients connects to the backend in phase 3.</EmptyState>
    </>
  );
}
