import Link from "next/link";
import { formatDateTime } from "@/shared/format";
import type { RecentChange } from "@/types/overview";

export function RecentChanges({ changes }: { changes: RecentChange[] }) {
  return (
    <section aria-labelledby="changes-heading" className="flex flex-col gap-2.5 rounded-[10px] border border-line bg-card p-5.5">
      <h2 id="changes-heading" className="text-[1.2rem] font-extrabold">
        Recent changes
      </h2>
      {changes.length === 0 ? (
        <p className="text-text-dim">No changes yet.</p>
      ) : (
        <ul className="flex flex-col">
          {changes.map((change) => (
            <li key={change.id} className="flex flex-col border-t border-line-soft py-2.5 first:border-t-0">
              <span>
                {change.clientId ? (
                  <Link href={`/clients/${change.clientId}`} className="font-semibold underline">
                    {change.clientName}
                  </Link>
                ) : (
                  <Link href="/content" className="font-semibold underline">
                    Site content
                  </Link>
                )}
                : {change.text}
              </span>
              <span className="text-[0.81rem] text-text-dim">
                {formatDateTime(change.at)} · by {change.by}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
