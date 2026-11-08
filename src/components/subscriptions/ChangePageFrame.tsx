import Link from "next/link";
import type { ReactNode } from "react";
import { ErrorState } from "@/components/ui/States";
import type { LoadedSubscription } from "@/lib/loaders/subscription";
import type { ClientDetail } from "@/types/client";
import type { ClientSubscription } from "@/types/subscription";

type ChangePageFrameProps = {
  loaded: LoadedSubscription;
  /** "Change services", "Change plan". */
  title: string;
  /** The form, once the client has an active plan. */
  children: (client: ClientDetail, subscription: ClientSubscription) => ReactNode;
};

/** The shared frame for pages that change a client's subscription, with their error and refusal states. */
export function ChangePageFrame({ loaded, title, children }: ChangePageFrameProps) {
  if (!loaded.ok) {
    return <ErrorState message={loaded.error.message} action={<Link href="/clients" className="font-semibold text-maroon underline">Back to clients</Link>} />;
  }

  const { client, subscription } = loaded;
  const back = (
    <Link href={`/clients/${client.id}`} className="w-fit font-semibold text-maroon underline">
      Back to {client.fullName}
    </Link>
  );

  return (
    <>
      {back}
      <div className="flex flex-col gap-1">
        <h1 className="text-[1.9rem] font-extrabold">{title}</h1>
        <p className="text-text-dim">For {client.fullName}, on their behalf. The client is emailed to confirm.</p>
      </div>
      {subscription?.status === "active" ? (
        children(client, subscription)
      ) : (
        <p className="rounded-[10px] border border-line bg-card p-6">
          {subscription ? "This plan is cancelled, so it can't be changed. Keep the plan first if the client wants to stay." : "This client doesn't have a plan."}
        </p>
      )}
    </>
  );
}
