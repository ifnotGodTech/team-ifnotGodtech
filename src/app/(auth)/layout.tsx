import Image from "next/image";
import { notFound } from "next/navigation";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  // Nothing is reachable on the live site until every screen uses the real backend.
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="on-ink flex min-h-screen items-center justify-center bg-ink px-4 py-12 text-paper">
      <div className="flex w-full max-w-[420px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/ifnotgod-icon.png" alt="" width={44} height={43} className="h-11 w-11 object-contain" priority />
          <h1 className="text-[1.75rem] font-extrabold">Team dashboard</h1>
          <p className="text-on-ink-dim">For the IFNOTGOD TECH team only.</p>
        </div>
        {children}
      </div>
    </main>
  );
}
