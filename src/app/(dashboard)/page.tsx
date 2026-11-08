import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/States";

export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" />
      <EmptyState title="Nothing to show yet">The overview connects to the backend in phase 5.</EmptyState>
    </>
  );
}
