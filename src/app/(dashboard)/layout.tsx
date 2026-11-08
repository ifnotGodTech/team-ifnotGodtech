import { notFound } from "next/navigation";
import { SessionTimer } from "@/components/auth/SessionTimer";
import { Sidebar } from "@/components/layout/Sidebar";
import { requireStaff } from "@/lib/auth";
import { keepAliveAction } from "@/lib/auth/actions";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // Nothing is reachable on the live site until the real backend is connected (phase 7).
  if (process.env.VERCEL_ENV === "production") notFound();
  const { staff, expiresAt } = await requireStaff();

  return (
    <div className="flex min-h-screen flex-wrap content-start">
      <Sidebar staffEmail={staff.email} />
      <main className="flex min-w-0 grow-[999] basis-[560px] flex-col gap-6 px-[clamp(16px,3vw,40px)] pb-16 pt-8">
        <SessionTimer expiresAt={expiresAt} keepAlive={keepAliveAction} />
        {children}
      </main>
    </div>
  );
}
