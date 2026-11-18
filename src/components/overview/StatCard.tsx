import Link from "next/link";

type StatCardProps = { label: string; value: number; note: string; href: string };

/** One count at a glance, linking to the list behind it. */
export function StatCard({ label, value, note, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-[10px] border border-line bg-card p-5 hover:border-maroon focus-visible:border-maroon"
    >
      <span className="font-semibold text-text-dim">{label}</span>
      <span className="text-[2rem] font-extrabold leading-tight text-text">{value}</span>
      <span className="text-[0.88rem] text-text-dim">{note}</span>
    </Link>
  );
}
