import type { Metadata } from "next";
import Link from "next/link";
import { LeadFilters, LeadPages } from "@/components/leads/LeadFilters";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { listLeads } from "@/lib/api/leads";
import { requireStaff } from "@/lib/auth";
import { formatDateTime } from "@/shared/format";
import { isLeadFilter } from "@/shared/leads";
import type { LeadFilter, LeadSummary } from "@/types/lead";

export const metadata: Metadata = { title: "Leads" };

const COLUMNS = [
  {
    key: "from",
    header: "From",
    cell: (lead: LeadSummary) => (
      <span className="flex flex-col">
        <Link href={`/leads/${lead.id}`} className="font-bold text-text underline">
          {lead.fullName}
        </Link>
        <span className="text-[0.81rem] text-text-dim">{lead.organisation ?? "No business given"}</span>
      </span>
    ),
  },
  { key: "plan", header: "Interested in", cell: (lead: LeadSummary) => lead.planName ?? "Not sure yet" },
  { key: "status", header: "Status", cell: (lead: LeadSummary) => <LeadStatusBadge status={lead.status} /> },
  { key: "received", header: "Received", nowrap: true, cell: (lead: LeadSummary) => formatDateTime(lead.receivedAt) },
];

const EMPTY: Record<LeadFilter, [string, string]> = {
  all: ["No audit requests yet", "Requests from the website's audit form appear here, and are emailed to the team."],
  new: ["No new leads", "Requests nobody has followed up yet appear here."],
  contacted: ["No leads marked as contacted", "Mark a lead as contacted once you've got back to them."],
  closed: ["No closed leads", "Mark a lead as closed when there's nothing more to do."],
};

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const { token } = await requireStaff();
  const { show, page } = await searchParams;
  const filter: LeadFilter = isLeadFilter(show) ? show : "all";
  const pageNumber = Math.max(1, Number(page) || 1);
  const result = await listLeads(token, filter, pageNumber);

  return (
    <>
      <PageHeader
        title="Leads"
        intro="Free audit requests from the website, newest first. Each one is also emailed to the team. They're deleted automatically after 24 months, as the Privacy Policy says."
      />
      {!result.ok ? (
        <ErrorState message={result.error.message} action={<Link href="/leads" className="font-semibold text-maroon underline">Try again</Link>} />
      ) : (
        <>
          <LeadFilters current={filter} counts={result.data.counts} />
          <DataTable
            label="Lead list"
            columns={COLUMNS}
            rows={result.data.items}
            rowKey={(lead) => lead.id}
            empty={<EmptyState title={EMPTY[filter][0]}>{EMPTY[filter][1]}</EmptyState>}
          />
          <LeadPages filter={filter} page={result.data.page} pageSize={result.data.pageSize} total={result.data.total} />
        </>
      )}
    </>
  );
}
