import type { Metadata } from "next";
import Link from "next/link";
import { SubscriptionFilters } from "@/components/subscriptions/SubscriptionFilters";
import { SubscriptionStatusBadge } from "@/components/subscriptions/SubscriptionStatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { listSubscriptions } from "@/lib/api/subscriptions";
import { requireStaff } from "@/lib/auth";
import { formatShortDate } from "@/shared/format";
import { isSubscriptionFilter, periodLabel, RENEWING_SOON_DAYS } from "@/shared/subscriptions";
import type { SubscriptionFilter, SubscriptionRow } from "@/types/subscription";

export const metadata: Metadata = { title: "Subscriptions" };

const COLUMNS = [
  {
    key: "client",
    header: "Client",
    cell: (row: SubscriptionRow) => (
      <Link href={`/clients/${row.clientId}`} className="font-bold text-text underline">
        {row.clientName}
      </Link>
    ),
  },
  {
    key: "plan",
    header: "Plan",
    cell: (row: SubscriptionRow) => (row.pendingPlanName ? `${row.planName} → ${row.pendingPlanName} at renewal` : row.planName),
  },
  { key: "paid", header: "Paid", cell: (row: SubscriptionRow) => periodLabel(row.billingPeriod) },
  { key: "status", header: "Status", cell: (row: SubscriptionRow) => <SubscriptionStatusBadge status={row.status} /> },
  {
    key: "date",
    header: "Renews or ends",
    nowrap: true,
    cell: (row: SubscriptionRow) => (row.status === "active" ? formatShortDate(row.currentPeriodEnd) : `Ends ${formatShortDate(row.currentPeriodEnd)}`),
  },
  {
    key: "services",
    header: "Services chosen",
    cell: (row: SubscriptionRow) => (row.servicesIncluded === null ? `${row.servicesChosen}, as agreed` : `${row.servicesChosen} of ${row.servicesIncluded}`),
  },
];

const EMPTY: Record<SubscriptionFilter, [string, string]> = {
  all: ["No subscriptions yet", "Subscriptions appear here when clients subscribe on the website."],
  active: ["No active subscriptions", "Active plans appear here."],
  renewing: [`Nothing renews in the next ${RENEWING_SOON_DAYS} days`, "Plans due to renew soon appear here, with their reminders."],
  cancelled: ["No cancelled plans still running", "Plans cancelled before the end of their paid period appear here until they end."],
};

export default async function SubscriptionsPage({ searchParams }: PageProps<"/subscriptions">) {
  const { token } = await requireStaff();
  const { show } = await searchParams;
  const filter: SubscriptionFilter = isSubscriptionFilter(show) ? show : "all";
  const result = await listSubscriptions(token, filter);

  return (
    <>
      <PageHeader title="Subscriptions" intro="Plans renew automatically. Clients get a reminder before each renewal." />
      {!result.ok ? (
        <ErrorState message={result.error.message} action={<Link href="/subscriptions" className="font-semibold text-maroon underline">Try again</Link>} />
      ) : (
        <>
          <SubscriptionFilters current={filter} counts={result.data.counts} />
          <DataTable
            label="Subscription list"
            columns={COLUMNS}
            rows={result.data.items}
            rowKey={(row) => row.clientId}
            empty={<EmptyState title={EMPTY[filter][0]}>{EMPTY[filter][1]}</EmptyState>}
          />
        </>
      )}
    </>
  );
}
