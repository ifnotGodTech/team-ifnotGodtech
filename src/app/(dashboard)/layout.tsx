import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  // Until staff log in exists (phase 2), no page may be seen on the live site.
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <div className="flex min-h-screen flex-wrap content-start">
      <Sidebar />
      <main className="flex min-w-0 grow-[999] basis-[560px] flex-col gap-6 px-[clamp(16px,3vw,40px)] pb-16 pt-8">{children}</main>
    </div>
  );
}
