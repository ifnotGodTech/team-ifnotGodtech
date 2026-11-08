import type { Metadata } from "next";
import Link from "next/link";
import { ClientSearch } from "@/components/clients/ClientSearch";
import { Pagination } from "@/components/clients/Pagination";
import { PlanStatusBadge } from "@/components/clients/PlanStatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { getBackend } from "@/lib/api";
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
  await requireStaff();
  const { q, page } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const result = await getBackend().searchClients({ query, page: Number(page) || 1 });

  return (
    <>
      <PageHeader title="Clients" intro="Everyone with an account on the website." />
      <ClientSearch query={query} />

      {!result.ok ? (
        <ErrorState message={result.error.message} action={<Link href="/clients" className="font-semibold text-maroon underline">Try again</Link>} />
      ) : (
        <>
          <p role="status" className="text-text-dim">
            {query
              ? `${result.data.total} ${result.data.total === 1 ? "client matches" : "clients match"} “${query}”`
              : `${result.data.total} ${result.data.total === 1 ? "client" : "clients"}`}
          </p>
          <DataTable
            label="Client list"
            columns={COLUMNS}
            rows={result.data.items}
            rowKey={(client) => client.id}
            empty={
              <EmptyState title={query ? "No clients match your search" : "No clients yet"}>
                {query ? "Check the spelling, or search by email instead." : "Clients appear here when they create an account on the website."}
              </EmptyState>
            }
          />
          <Pagination {...result.data} query={query} />
        </>
      )}
    </>
  );
}
