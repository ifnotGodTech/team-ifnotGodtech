import Link from "next/link";
import { cn } from "@/shared/cn";
import { FILTERS } from "@/shared/subscriptions";
import type { SubscriptionFilter } from "@/types/subscription";

/** Links rather than buttons, so each filter has its own address and works without JavaScript. */
export function SubscriptionFilters({ current, counts }: { current: SubscriptionFilter; counts: Record<SubscriptionFilter, number> }) {
  return (
    <nav aria-label="Show">
      <ul className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const selected = filter.id === current;
          return (
            <li key={filter.id}>
              <Link
                href={filter.id === "all" ? "/subscriptions" : `/subscriptions?show=${filter.id}`}
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
