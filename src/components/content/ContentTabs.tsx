import Link from "next/link";
import { cn } from "@/shared/cn";

export const CONTENT_TABS = [
  { id: "plans", label: "Plans and prices" },
  { id: "services", label: "Services" },
  { id: "groups", label: "Service groups" },
  { id: "text", label: "Site text" },
] as const;

export type ContentTab = (typeof CONTENT_TABS)[number]["id"];

export const isContentTab = (value: unknown): value is ContentTab => CONTENT_TABS.some((tab) => tab.id === value);

/** Links rather than buttons, so each section has its own address and works without JavaScript. */
export function ContentTabs({ current }: { current: ContentTab }) {
  return (
    <nav aria-label="Section">
      <ul className="flex flex-wrap gap-2">
        {CONTENT_TABS.map((tab) => (
          <li key={tab.id}>
            <Link
              href={tab.id === "plans" ? "/content" : `/content?tab=${tab.id}`}
              aria-current={tab.id === current ? "page" : undefined}
              className={cn(
                "inline-block rounded-full border px-4 py-2 font-semibold",
                tab.id === current ? "border-maroon bg-maroon font-bold text-white" : "border-field bg-card text-text hover:border-maroon"
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
