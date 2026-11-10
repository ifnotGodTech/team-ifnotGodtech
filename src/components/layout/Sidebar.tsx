"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logOutAction } from "@/lib/auth/actions";
import { cn } from "@/shared/cn";

export const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/clients", label: "Clients" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/leads", label: "Leads" },
  { href: "/content", label: "Site content" },
] as const;

export function isCurrent(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** `newLeads`: audit requests nobody has followed up yet, shown beside Leads. */
export function Sidebar({ staffEmail, newLeads = 0 }: { staffEmail: string; newLeads?: number }) {
  const pathname = usePathname();

  // Full height only beside the content (from 800px wide). Stacked on a phone, it stays compact.
  return (
    <aside className="on-ink flex basis-60 grow flex-col gap-7 bg-ink px-4 py-6 text-paper min-[800px]:min-h-screen">
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <Image src="/ifnotgod-icon.png" alt="" width={32} height={31} className="h-8 w-8 object-contain" />
        <span className="flex flex-col leading-tight">
          <span className="font-display text-[0.94rem] font-extrabold">IFNOTGOD TECH</span>
          <span className="text-[0.75rem] text-on-ink-dim">Team dashboard</span>
        </span>
      </Link>
      {/* Side by side and wrapping when stacked above the page (narrower than 800px), so the menu stays compact. */}
      <nav aria-label="Dashboard" className="flex flex-wrap gap-1 font-semibold min-[800px]:flex-col">
        {NAV_ITEMS.map((item) => {
          const current = isCurrent(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-3 py-2.5",
                current ? "bg-maroon text-white" : "text-on-ink-dim hover:bg-ink-line hover:text-paper"
              )}
            >
              {item.label}
              {item.href === "/leads" && newLeads > 0 && (
                <>
                  {/* Read as "Leads 3 new". */}{" "}
                  <span className="rounded-full bg-paper px-2 text-[0.75rem] font-bold text-maroon">{newLeads} new</span>
                </>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1.5 border-t border-ink-line px-2 pt-3.5 text-[0.88rem]">
        <span className="text-on-ink-dim">
          Signed in as <span className="block text-paper [overflow-wrap:anywhere]">{staffEmail}</span>
        </span>
        <form action={logOutAction}>
          <button type="submit" className="cursor-pointer font-semibold text-orange-text underline">
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
