import { notFound } from "next/navigation";
import { getCatalogue } from "@/lib/api/content";
import { getClient } from "@/lib/api/clients";
import { getSubscription } from "@/lib/api/subscriptions";
import type { ApiError } from "@/lib/api/errors";
import type { Catalogue } from "@/types/catalogue";
import type { ClientDetail } from "@/types/client";
import type { ClientSubscription } from "@/types/subscription";

export type LoadedSubscription =
  | { ok: true; client: ClientDetail; subscription: ClientSubscription | null; catalogue: Catalogue }
  | { ok: false; error: ApiError };

/** A client, their subscription and the catalogue, for the pages that change a subscription. */
export async function loadSubscription(token: string, id: string): Promise<LoadedSubscription> {
  const [client, subscription, catalogue] = await Promise.all([getClient(token, id), getSubscription(token, id), getCatalogue(token)]);
  if (!client.ok && client.error.code === "NOT_FOUND") notFound();
  if (!client.ok) return client;
  if (!subscription.ok) return subscription;
  if (!catalogue.ok) return catalogue;
  return { ok: true, client: client.data, subscription: subscription.data, catalogue: catalogue.data };
}
