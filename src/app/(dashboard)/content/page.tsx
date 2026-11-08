import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentTabs, isContentTab, type ContentTab } from "@/components/content/ContentTabs";
import { GroupForm } from "@/components/content/GroupForm";
import { PlanCard } from "@/components/content/PlanCard";
import { ServiceForm } from "@/components/content/ServiceForm";
import { ServiceList } from "@/components/content/ServiceList";
import { SiteTextForm } from "@/components/content/SiteTextForm";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/States";
import { getBackend } from "@/lib/api";
import { saveGroupAction, savePlanAction, saveServiceAction, saveSiteTextAction } from "@/lib/actions/content";
import { requireStaff } from "@/lib/auth";
import { WHEN_LIVE } from "@/shared/content";
import { cn } from "@/shared/cn";

export const metadata: Metadata = { title: "Site content" };

const NOTICES: Record<string, [ok: boolean, text: string]> = {
  service: [true, `Service saved. ${WHEN_LIVE}`],
  "new-service": [true, `Service added. ${WHEN_LIVE}`],
  hidden: [true, "Service hidden from the website. It keeps running for clients who already have it."],
  shown: [true, `Service shown on the website again. ${WHEN_LIVE}`],
  failed: [false, "We couldn't change that service. Please try again."],
  "new-group": [true, `Group added. ${WHEN_LIVE}`],
};

const GRID = "grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-start gap-4";

export default async function SiteContentPage({ searchParams }: PageProps<"/content">) {
  await requireStaff();
  const { tab: tabParam, edit, saved } = await searchParams;
  const tab: ContentTab = isContentTab(tabParam) ? tabParam : "plans";
  const editing = typeof edit === "string" ? edit : null;
  const backend = getBackend();
  const [catalogue, siteText] = await Promise.all([backend.getCatalogue(), tab === "text" ? backend.getSiteText() : null]);
  const notice = typeof saved === "string" ? NOTICES[saved] : undefined;

  const header = (
    <>
      <PageHeader title="Site content" intro={`What the public website shows. ${WHEN_LIVE.replace("It appears", "Saved changes appear")}`} />
      <ContentTabs current={tab} />
      {notice && (
        <p role="status" className={cn("rounded-md border px-4 py-3 font-semibold", notice[0] ? "border-success/40 bg-success-bg text-success" : "border-maroon bg-maroon-tint text-maroon")}>
          {notice[1]}
        </p>
      )}
    </>
  );

  const failure = !catalogue.ok ? catalogue.error : siteText && !siteText.ok ? siteText.error : null;
  if (failure || !catalogue.ok) {
    return (
      <>
        {header}
        <ErrorState message={failure?.message ?? ""} action={<Link href="/content" className="font-semibold text-maroon underline">Try again</Link>} />
      </>
    );
  }

  const { plans, groups, services } = catalogue.data;
  const priced = plans.filter((plan) => plan.monthlyPrice !== null);

  if (tab === "plans") {
    return (
      <>
        {header}
        <div className={GRID}>
          {priced.map((plan) => (
            <PlanCard key={plan.id} action={savePlanAction} plan={plan} groups={groups} />
          ))}
        </div>
        <p className="text-[0.94rem] text-text-dim">Custom is quoted after the audit, so it has no price here.</p>
      </>
    );
  }

  if (tab === "services") {
    const service = editing && editing !== "new" ? services.find((item) => item.id === editing) : null;
    if (editing && editing !== "new" && !service) notFound();
    return (
      <>
        {header}
        {editing ? (
          <ServiceForm action={saveServiceAction} service={service ?? null} groups={groups} plans={priced} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-text-dim">Each service shows on the website under its group, in the plans that include it.</p>
            <ButtonLink href="/content?tab=services&edit=new">Add a service</ButtonLink>
          </div>
        )}
        <ServiceList catalogue={catalogue.data} />
      </>
    );
  }

  if (tab === "groups") {
    return (
      <>
        {header}
        {editing === "new" ? (
          <GroupForm action={saveGroupAction} group={null} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-text-dim">Groups organise services on the website. Each plan sets how many services it includes from each group, under Plans and prices.</p>
            <ButtonLink href="/content?tab=groups&edit=new">Add a group</ButtonLink>
          </div>
        )}
        <div className={GRID}>
          {groups.map((group) => {
            const count = services.filter((service) => service.group === group.id).length;
            const included = priced.map((plan) => `${plan.name} ${plan.allowances[group.id] ?? 0}`).join(", ");
            return <GroupForm key={group.id} action={saveGroupAction} group={group} summary={`${count} ${count === 1 ? "service" : "services"} · ${included}`} />;
          })}
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      {siteText?.ok && <SiteTextForm action={saveSiteTextAction} text={siteText.data} />}
    </>
  );
}
