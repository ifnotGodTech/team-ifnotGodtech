import Link from "next/link";
import { cn } from "@/shared/cn";
import { LEAD_FILTERS } from "@/shared/leads";
import type { LeadFilter } from "@/types/lead";

const hrefFor = (filter: LeadFilter, page = 1) => {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("show", filter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/leads?${query}` : "/leads";
};

/** Links rather than buttons, so each filter has its own address and works without JavaScript. */
export function LeadFilters({ current, counts }: { current: LeadFilter; counts: Record<LeadFilter, number> }) {
  return (
    <nav aria-label="Show">
      <ul className="flex flex-wrap gap-2">
        {LEAD_FILTERS.map((filter) => {
          const selected = filter.id === current;
          return (
            <li key={filter.id}>
              <Link
                href={hrefFor(filter.id)}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "inline-block rounded-full border px-4 py-2 font-semibold",
                  selected ? "border-maroon bg-maroon font-bold text-white" : "border-field bg-card text-text hover:border-maroon"
                )}
              >
                {filter.label} ({counts[filter.id]})
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function LeadPages({ filter, page, pageSize, total }: { filter: LeadFilter; page: number; pageSize: number; total: number }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {page > 1 && (
        <Link href={hrefFor(filter, page - 1)} className="font-semibold text-maroon underline">
          Previous page
        </Link>
      )}
      <span className="text-text-dim">
        Page {page} of {pages}
      </span>
      {page < pages && (
        <Link href={hrefFor(filter, page + 1)} className="font-semibold text-maroon underline">
          Next page
        </Link>
      )}
    </nav>
  );
}
