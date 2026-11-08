import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "Site content" };

export default function SitecontentPage() {
  return (
    <>
      <PageHeader title="Site content" />
      <EmptyState title="Nothing to show yet">Site content connects to the backend in phase 6.</EmptyState>
    </>
  );
}
