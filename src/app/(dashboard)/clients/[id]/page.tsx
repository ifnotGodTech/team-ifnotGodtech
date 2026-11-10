import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientNotice } from "@/components/clients/ClientNotice";
import { PaymentsTable } from "@/components/subscriptions/PaymentsTable";
import { SubscriptionPanel } from "@/components/subscriptions/SubscriptionPanel";
import { ConfirmPanel } from "@/components/ui/ConfirmPanel";
import { ErrorState } from "@/components/ui/States";
import { getCatalogue } from "@/lib/api/content";
import { getClient } from "@/lib/api/clients";
import { getSubscription } from "@/lib/api/subscriptions";
import { sendPasswordResetAction } from "@/lib/actions/clients";
import { requireStaff } from "@/lib/auth";
import { formatDateTime, formatLongDate } from "@/shared/format";

export const metadata: Metadata = { title: "Client" };

const CARD = "flex flex-col gap-3 rounded-[10px] border border-line bg-card p-6";
const SIGN_IN = { password: "Email and password", google: "Google" } as const;
const BACK = (
  <Link href="/clients" className="w-fit font-semibold text-maroon underline">
    Back to clients
  </Link>
);

export default async function ClientPage({ params, searchParams }: PageProps<"/clients/[id]">) {
  const { token } = await requireStaff();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [result, subscription, catalogue] = await Promise.all([getClient(token, id), getSubscription(token, id), getCatalogue(token)]);

  if (!result.ok && result.error.code === "NOT_FOUND") notFound();
  if (!result.ok) return <ErrorState message={result.error.message} action={BACK} />;
  const client = result.data;

  return (
    <>
      {BACK}
      <div className="flex flex-col gap-1">
        <h1 className="text-[1.9rem] font-extrabold">{client.fullName}</h1>
        <p className="text-text-dim">{[client.businessName, client.email].filter(Boolean).join(" · ")}</p>
      </div>

      <ClientNotice query={query} />

      {!subscription.ok || !catalogue.ok ? (
        <ErrorState
          message={(!subscription.ok ? subscription.error : !catalogue.ok ? catalogue.error : null)?.message ?? ""}
          action={<Link href={`/clients/${client.id}`} className="font-semibold text-maroon underline">Try again</Link>}
        />
      ) : subscription.data ? (
        <SubscriptionPanel clientId={client.id} clientName={client.fullName} subscription={subscription.data} catalogue={catalogue.data} />
      ) : (
        <section aria-labelledby="plan-heading" className={CARD}>
          <h2 id="plan-heading" className="text-[1.25rem] font-extrabold">
            No plan
          </h2>
          <p className="text-text-dim">This client hasn&apos;t subscribed. They choose a plan from their account on the website.</p>
        </section>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(400px,100%),1fr))] items-start gap-5">
        {subscription.ok && subscription.data && <PaymentsTable payments={subscription.data.payments} />}
        <section aria-labelledby="history-heading" className={CARD}>
          <h2 id="history-heading" className="text-[1.2rem] font-extrabold">
            History
          </h2>
          <ul className="flex flex-col">
            {client.history.map((entry) => (
              <li key={entry.id} className="flex flex-col border-t border-line-soft py-2.5 first:border-t-0">
                <span>{entry.text}</span>
                <span className="text-[0.81rem] text-text-dim">
                  {formatDateTime(entry.at)} · by {entry.by}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="account-heading" className={CARD}>
        <h2 id="account-heading" className="text-[1.2rem] font-extrabold">
          Account
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-6 gap-y-3">
          <div>
            <dt className="font-semibold">Signs in with</dt>
            <dd className="text-text-dim">{SIGN_IN[client.signInMethod]}</dd>
          </div>
          <div>
            <dt className="font-semibold">Joined</dt>
            <dd className="text-text-dim">{formatLongDate(client.joinedOn)}</dd>
          </div>
          <div>
            <dt className="font-semibold">Phone or WhatsApp</dt>
            <dd className="text-text-dim">{client.phone ?? "Not given"}</dd>
          </div>
        </dl>
        {client.signInMethod === "password" ? (
          <div>
            <ConfirmPanel
              triggerLabel="Send a password reset email"
              title={`Send ${client.fullName} a password reset email?`}
              confirmLabel="Send the email"
              action={sendPasswordResetAction}
              fields={{ clientId: client.id }}
            >
              <p>We&apos;ll email {client.email} a link to set a new password. Nothing changes until they use it.</p>
            </ConfirmPanel>
          </div>
        ) : (
          <p className="text-[0.94rem] text-text-dim">This client signs in with Google, so there&apos;s no password to reset.</p>
        )}
      </section>
    </>
  );
}
