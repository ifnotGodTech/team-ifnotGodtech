import Link from "next/link";
import { formatDayMonth } from "@/shared/format";
import { periodLabel, RENEWING_SOON_DAYS } from "@/shared/subscriptions";
import type { UpcomingRenewal } from "@/types/overview";

const reminderText = (reminder: UpcomingRenewal["reminder"]) =>
  !reminder ? "None" : reminder.sentOn ? `Sent ${formatDayMonth(reminder.sentOn)}` : `Due ${formatDayMonth(reminder.dueOn)}`;

export function RenewalsTable({ renewals }: { renewals: UpcomingRenewal[] }) {
  return (
    <section aria-labelledby="renewing-heading" className="flex flex-col gap-3 rounded-[10px] border border-line bg-card p-5.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="renewing-heading" className="text-[1.2rem] font-extrabold">
          Renewing in the next {RENEWING_SOON_DAYS} days
        </h2>
        <Link href="/subscriptions?show=renewing" className="font-semibold text-maroon underline">
          See all
        </Link>
      </div>
      {renewals.length === 0 ? (
        <p className="text-text-dim">Nothing renews in the next {RENEWING_SOON_DAYS} days.</p>
      ) : (
        <div role="region" aria-label="Upcoming renewals" tabIndex={0} className="overflow-x-auto">
          <table className="w-full min-w-[340px] border-collapse text-[0.94rem]">
            <thead>
              <tr className="text-left text-[0.81rem] text-text-dim">
                <th scope="col" className="py-1.5 pr-2.5 font-semibold">Client</th>
                <th scope="col" className="px-2.5 py-1.5 font-semibold">Plan</th>
                <th scope="col" className="px-2.5 py-1.5 font-semibold">Renews</th>
                <th scope="col" className="py-1.5 pl-2.5 font-semibold">Reminder</th>
              </tr>
            </thead>
            <tbody>
              {renewals.map((row) => (
                <tr key={row.clientId} className="border-t border-line-soft">
                  <td className="py-2.5 pr-2.5">
                    <Link href={`/clients/${row.clientId}`} className="font-bold underline">
                      {row.clientName}
                    </Link>
                  </td>
                  <td className="px-2.5 py-2.5">
                    {row.planName}, {periodLabel(row.billingPeriod).toLowerCase()}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2.5">{formatDayMonth(row.renewsOn)}</td>
                  <td className="whitespace-nowrap py-2.5 pl-2.5">{reminderText(row.reminder)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
