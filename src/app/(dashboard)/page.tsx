import type { Metadata } from "next";
import Link from "next/link";
import { RecentChanges } from "@/components/overview/RecentChanges";
import { RenewalsTable } from "@/components/overview/RenewalsTable";
import { StatCard } from "@/components/overview/StatCard";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/States";
import { getBackend } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { formatNaira, formatShortDate, formatWeekdayDate } from "@/shared/format";
import { RENEWING_SOON_DAYS } from "@/shared/subscriptions";

export const metadata: Metadata = { title: "Overview" };

const today = () => new Date().toISOString();

export default async function OverviewPage() {
  await requireStaff();
  const result = await getBackend().getOverview();
  const header = (
    <PageHeader
      title="Overview"
      intro={formatWeekdayDate(today())}
      actions={<ButtonLink href="/clients" variant="secondary">Find a client</ButtonLink>}
    />
  );

  if (!result.ok) {
    return (
      <>
        {header}
        <ErrorState message={result.error.message} action={<Link href="/" className="font-semibold text-maroon underline">Try again</Link>} />
      </>
    );
  }

  const overview = result.data;
  const remindersSent = overview.renewingSoon.filter((row) => row.reminder?.sentOn).length;

  return (
    <>
      {header}
      <section aria-label="At a glance" className="grid grid-cols-[repeat(auto-fit,minmax(min(210px,100%),1fr))] gap-4">
        <StatCard
          label="Active subscriptions"
          value={overview.activeSubscriptions}
          note={`${formatNaira(overview.monthlyIncome)} a month at plan prices`}
          href="/subscriptions?show=active"
        />
        <StatCard
          label={`Renewing in ${RENEWING_SOON_DAYS} days`}
          value={overview.renewingSoon.length}
          note={overview.renewingSoon.length ? `${remindersSent} of ${overview.renewingSoon.length} reminders sent` : "None due"}
          href="/subscriptions?show=renewing"
        />
        <StatCard
          label="Cancelled, still running"
          value={overview.cancelledStillRunning}
          note={overview.nextCancellationEnds ? `Next ends ${formatShortDate(overview.nextCancellationEnds)}` : "None running"}
          href="/subscriptions?show=cancelled"
        />
        <StatCard label="Clients without a plan" value={overview.clientsWithoutPlan} note="Signed up, not subscribed" href="/clients?plan=none" />
      </section>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-start gap-5">
        <RenewalsTable renewals={overview.renewingSoon} />
        <RecentChanges changes={overview.recentChanges} />
      </div>
    </>
  );
}
