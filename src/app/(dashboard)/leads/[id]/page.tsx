import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { setLeadStatusAction } from "@/lib/actions/leads";
import { getLead } from "@/lib/api/leads";
import { requireStaff } from "@/lib/auth";
import { formatDateTime, formatLongDate } from "@/shared/format";
import type { LeadStatus } from "@/types/lead";

export const metadata: Metadata = { title: "Lead" };

const BACK = (
  <Link href="/leads" className="w-fit font-semibold text-maroon underline">
    Back to leads
  </Link>
);

const DONE: Record<string, string> = {
  new: "Marked as new again.",
  contacted: "Marked as contacted.",
  closed: "Marked as closed.",
};

const CARD = "flex flex-col gap-3.5 rounded-[10px] border border-line bg-card p-6";

function StatusButton({ leadId, status, primary = false, children }: { leadId: string; status: LeadStatus; primary?: boolean; children: string }) {
  return (
    <form action={setLeadStatusAction}>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant={primary ? "primary" : "secondary"}>
        {children}
      </Button>
    </form>
  );
}

export default async function LeadPage({ params, searchParams }: PageProps<"/leads/[id]">) {
  const { token } = await requireStaff();
  const [{ id }, { done, failed }] = await Promise.all([params, searchParams]);
  const result = await getLead(token, id);
  if (!result.ok && result.error.code === "NOT_FOUND") notFound();
  if (!result.ok) return <ErrorState message={result.error.message} action={BACK} />;
  const lead = result.data;
  const notice = typeof done === "string" ? DONE[done] : undefined;

  return (
    <>
      {BACK}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2.5">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-[1.875rem] font-extrabold tracking-[-0.02em]">{lead.fullName}</h1>
          <p className="text-text-dim">
            {lead.organisation ? `${lead.organisation} · ` : ""}asked for a free audit {formatDateTime(lead.receivedAt)}
          </p>
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>

      {notice && (
        <p role="status" className="rounded-[10px] border border-success bg-success-bg px-4.5 py-3 font-semibold text-success">
          {notice}
        </p>
      )}
      {failed && (
        <p role="alert" className="rounded-[10px] border border-maroon bg-maroon-tint px-4.5 py-3 font-semibold text-maroon">
          That couldn&apos;t be saved. Please try again.
        </p>
      )}

      <section aria-labelledby="request-heading" className={CARD}>
        <h2 id="request-heading" className="font-display text-[1.375rem] font-extrabold">
          Their request
        </h2>
        <blockquote className="max-w-[46em] whitespace-pre-line border-l-[3px] border-line py-1 pl-4 text-text [overflow-wrap:anywhere]">{lead.challenge}</blockquote>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-6 gap-y-3.5">
          <div>
            <dt className="font-semibold">Interested in</dt>
            <dd className="text-text-dim">{lead.planName ?? "Not sure yet"}</dd>
          </div>
          <div>
            <dt className="font-semibold">Received</dt>
            <dd className="text-text-dim">{formatDateTime(lead.receivedAt)}</dd>
          </div>
          <div>
            <dt className="font-semibold">Deleted on</dt>
            <dd className="text-text-dim">{formatLongDate(lead.deletedOn)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="contact-heading" className={CARD}>
        <h2 id="contact-heading" className="font-display text-[1.375rem] font-extrabold">
          Get back to them
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-x-6 gap-y-3.5">
          <div>
            <dt className="font-semibold">Email</dt>
            <dd className="text-text-dim [overflow-wrap:anywhere]">{lead.email}</dd>
          </div>
          <div>
            <dt className="font-semibold">Phone or WhatsApp</dt>
            <dd className="text-text-dim">{lead.phone ?? "Not given"}</dd>
          </div>
        </dl>
        <p className="text-[0.88rem] text-text-dim">
          The team&apos;s email about this request has their address as the reply-to, so you can answer it straight from your inbox.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {lead.status === "new" && (
            <StatusButton leadId={lead.id} status="contacted" primary>
              Mark as contacted
            </StatusButton>
          )}
          {lead.status !== "closed" && (
            <StatusButton leadId={lead.id} status="closed">
              Mark as closed
            </StatusButton>
          )}
          {lead.status === "closed" && (
            <StatusButton leadId={lead.id} status="new">
              Mark as new again
            </StatusButton>
          )}
        </div>
        <p className="text-[0.88rem] text-text-dim">Closed means nothing more to do: they signed up, or decided not to go ahead.</p>
      </section>
    </>
  );
}
