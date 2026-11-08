import { notFound } from "next/navigation";
import { getBackend } from "@/lib/api";
import type { ApiError } from "@/lib/api";
import type { Catalogue } from "@/types/catalogue";
import type { ClientDetail } from "@/types/client";
import type { ClientSubscription } from "@/types/subscription";

export type LoadedSubscription =
  | { ok: true; client: ClientDetail; subscription: ClientSubscription | null; catalogue: Catalogue }
  | { ok: false; error: ApiError };

/** A client, their subscription and the catalogue, for the pages that change a subscription. */
export async function loadSubscription(id: string): Promise<LoadedSubscription> {
  const backend = getBackend();
  const [client, subscription, catalogue] = await Promise.all([backend.getClient(id), backend.getSubscription(id), backend.getCatalogue()]);
  if (!client.ok && client.error.code === "NOT_FOUND") notFound();
  if (!client.ok) return client;
  if (!subscription.ok) return subscription;
  if (!catalogue.ok) return catalogue;
  return { ok: true, client: client.data, subscription: subscription.data, catalogue: catalogue.data };
}
