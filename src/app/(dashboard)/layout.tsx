import { notFound } from "next/navigation";
import { SessionTimer } from "@/components/auth/SessionTimer";
import { Sidebar } from "@/components/layout/Sidebar";
import { listLeads } from "@/lib/api/leads";
import { requireStaff } from "@/lib/auth";
import { keepAliveAction } from "@/lib/auth/actions";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // Nothing is reachable on the live site until every screen uses the real backend.
  if (process.env.VERCEL_ENV === "production") notFound();
  const { staff, token, expiresAt } = await requireStaff();
  // Only the count of new leads, for the sidebar. If it can't be read, the sidebar just leaves it out.
  const leads = await listLeads(token, "new", 1, 1);

  return (
    <div className="flex min-h-screen flex-wrap content-start">
      <Sidebar staffEmail={staff.email} newLeads={leads.ok ? leads.data.counts.new : 0} />
      <main className="flex min-w-0 grow-[999] basis-[560px] flex-col gap-6 px-[clamp(16px,3vw,40px)] pb-16 pt-8">
        <SessionTimer expiresAt={expiresAt} keepAlive={keepAliveAction} />
        {children}
      </main>
    </div>
  );
}
