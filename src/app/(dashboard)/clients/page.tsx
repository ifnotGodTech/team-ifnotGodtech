import type { Metadata } from "next";
import Link from "next/link";
import { ClientSearch } from "@/components/clients/ClientSearch";
import { Pagination } from "@/components/clients/Pagination";
import { PlanStatusBadge } from "@/components/clients/PlanStatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { searchClients } from "@/lib/api/clients";
import { requireStaff } from "@/lib/auth";
import { formatShortDate } from "@/shared/format";
import type { ClientSummary } from "@/types/client";

export const metadata: Metadata = { title: "Clients" };

const COLUMNS = [
  {
    key: "client",
    header: "Client",
    cell: (client: ClientSummary) => (
      <div className="flex flex-col">
        <Link href={`/clients/${client.id}`} className="font-bold text-text underline">
          {client.fullName}
        </Link>
        {client.businessName && <span className="text-[0.81rem] text-text-dim">{client.businessName}</span>}
      </div>
    ),
  },
  { key: "email", header: "Email", cell: (client: ClientSummary) => client.email },
  { key: "plan", header: "Plan", cell: (client: ClientSummary) => client.planName ?? "—" },
  { key: "status", header: "Status", cell: (client: ClientSummary) => <PlanStatusBadge status={client.planStatus} /> },
  { key: "joined", header: "Joined", nowrap: true, cell: (client: ClientSummary) => formatShortDate(client.joinedOn) },
];

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const { token } = await requireStaff();
  const { q, page, plan } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const withoutPlan = plan === "none";
  const result = await searchClients(token, { query, page: Number(page) || 1, withoutPlan });
  const total = result.ok ? result.data.total : 0;
  const counted = `${total} ${total === 1 ? "client" : "clients"}${withoutPlan ? " without a plan" : ""}`;

  return (
    <>
      <PageHeader title="Clients" intro="Everyone with an account on the website." />
      <ClientSearch query={query} withoutPlan={withoutPlan} />
      {withoutPlan && (
        <p className="flex flex-wrap gap-x-3 text-text-dim">
          Showing clients who signed up but haven&apos;t subscribed, or whose plan has ended.
          <Link href={query ? `/clients?q=${encodeURIComponent(query)}` : "/clients"} className="font-semibold text-maroon underline">
            Show all clients
          </Link>
        </p>
      )}

      {!result.ok ? (
        <ErrorState message={result.error.message} action={<Link href="/clients" className="font-semibold text-maroon underline">Try again</Link>} />
      ) : (
        <>
          <p role="status" className="text-text-dim">
            {query ? `${counted} ${total === 1 ? "matches" : "match"} “${query}”` : counted}
          </p>
          <DataTable
            label="Client list"
            columns={COLUMNS}
            rows={result.data.items}
            rowKey={(client) => client.id}
            empty={
              query ? (
                <EmptyState title="No clients match your search">Check the spelling, or search by email instead.</EmptyState>
              ) : withoutPlan ? (
                <EmptyState title="Every client has a plan">Clients who sign up without subscribing appear here.</EmptyState>
              ) : (
                <EmptyState title="No clients yet">Clients appear here when they create an account on the website.</EmptyState>
              )
            }
          />
          <Pagination {...result.data} query={query} withoutPlan={withoutPlan} />
        </>
      )}
    </>
  );
}
