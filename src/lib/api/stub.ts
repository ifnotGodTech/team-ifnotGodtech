import type { ClientDetail, ClientHistoryEntry, ClientSummary } from "@/types/client";
import type { LoginChallenge, StaffMember } from "@/types/staff";
import type { ClientSubscription, SubscriptionFilter, SubscriptionRow } from "@/types/subscription";
import { cookieSecret, signJson, verifyJson } from "@/lib/auth/signing";
import { checkServiceSelection, paidLabel, pricedPlans, RENEWING_SOON_DAYS, serviceChoices, servicesIncluded } from "@/shared/subscriptions";
import type { DashboardBackend } from "./backend";
import { apiError, type ApiResult } from "./errors";
import { STUB_CATALOGUE } from "./stubCatalogue";
import { STUB_CLIENTS } from "./stubData";
import { cookieStubStore, type StubChanges, type StubStore } from "./stubStore";
import { addDays, lagosToday, reminderFor, seedSubscriptions } from "./stubSubscriptions";

// A stand-in backend until phase 7. Nothing is stored and no email is sent. Any
// @ifnotgod.com email logs in, the code is always 123456, and fixed values show each error:
export const STUB_RULES = {
  staffDomain: "@ifnotgod.com",
  wrongPassword: "wrong-password",
  lockedEmail: "locked@ifnotgod.com",
  code: "123456",
} as const;

export const CODE_LIFETIME_MS = 10 * 60 * 1000;
export const CLIENTS_PAGE_SIZE = 10;

const summaryOf = ({ id, fullName, businessName, email, planName, planStatus, joinedOn }: ClientSummary): ClientSummary => ({
  id,
  fullName,
  businessName,
  email,
  planName,
  planStatus,
  joinedOn,
});

const ok = <T>(data: T): ApiResult<T> => ({ ok: true, data });
const notFound = (): ApiResult<never> => ({ ok: false, error: apiError("NOT_FOUND", 404) });
const refused = (message: string): ApiResult<never> => ({ ok: false, error: apiError("CONFLICT", 409, { message }) });
const invalid = (message: string): ApiResult<never> => ({ ok: false, error: apiError("VALIDATION", 422, { message }) });

const planNamed = (id: string) => STUB_CATALOGUE.plans.find((plan) => plan.id === id)!;
const serviceNamed = (id: string) => STUB_CATALOGUE.services.find((service) => service.id === id)?.name ?? id;
const list = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

function servicesChangeText(before: string[], after: string[]): string {
  const added = after.filter((id) => !before.includes(id)).map(serviceNamed);
  const removed = before.filter((id) => !after.includes(id)).map(serviceNamed);
  if (before.length === 0) return `Chose services: ${list(added)}`;
  if (added.length && removed.length) return `Swapped ${list(removed)} for ${list(added)}`;
  if (added.length) return `Added ${list(added)}`;
  return `Removed ${list(removed)}`;
}

/** A cancelled plan ends once its paid period is over. */
function withStatusToday(subscription: ClientSubscription, today: string): ClientSubscription {
  return subscription.status === "cancelled" && subscription.currentPeriodEnd < today ? { ...subscription, status: "ended" } : subscription;
}

function matchesFilter(subscription: ClientSubscription, filter: SubscriptionFilter, today: string): boolean {
  if (filter === "active") return subscription.status === "active";
  if (filter === "cancelled") return subscription.status === "cancelled";
  if (filter === "renewing") return subscription.status === "active" && subscription.currentPeriodEnd <= addDays(today, RENEWING_SOON_DAYS);
  return subscription.status !== "ended";
}

function staffFor(email: string): StaffMember {
  const local = email.split("@")[0].replace(/[._-]+/g, " ");
  const name = local.replace(/\b\w/g, (letter) => letter.toUpperCase());
  return { id: `staff-${Buffer.from(email).toString("base64url")}`, name, email };
}

function challengeFor(email: string, now: number): LoginChallenge {
  const expiresAt = now + CODE_LIFETIME_MS;
  return { challengeId: signJson({ email, expiresAt }, cookieSecret()), sentTo: email, expiresAt: new Date(expiresAt).toISOString() };
}

export function createStubBackend(now = () => Date.now(), store: StubStore = cookieStubStore): DashboardBackend {
  const today = () => lagosToday(now());

  /** Every client's subscription as it stands, with any changes made through the stand-in. */
  async function subscriptions(): Promise<{ changes: StubChanges; byClient: Record<string, ClientSubscription> }> {
    const changes = await store.read();
    const seeds = seedSubscriptions(today());
    const byClient: Record<string, ClientSubscription> = {};
    for (const [id, seed] of Object.entries(seeds)) {
      byClient[id] = withStatusToday({ ...seed, ...changes.subscriptions[id], payments: seed.payments }, today());
    }
    return { changes, byClient };
  }

  async function liveClient(client: ClientDetail): Promise<ClientDetail> {
    const { changes, byClient } = await subscriptions();
    const subscription = byClient[client.id];
    const subscribed: ClientHistoryEntry[] = subscription
      ? [{
          id: `${client.id}-subscribed`,
          at: `${subscription.payments.at(-1)?.paidOn ?? client.joinedOn}T09:20:00Z`,
          text: `Subscribed to ${planNamed(subscription.planId).name}, ${paidLabel(subscription.billingPeriod).replace("paid ", "")}`,
          by: "the client",
        }]
      : [];
    const history = [...(changes.history[client.id] ?? []), ...subscribed, ...client.history].sort((a, b) => b.at.localeCompare(a.at));
    return {
      ...structuredClone(client),
      planName: subscription && subscription.status !== "ended" ? planNamed(subscription.planId).name : null,
      planStatus: subscription && subscription.status !== "ended" ? subscription.status : "none",
      history,
    };
  }

  /** Applies a change on a client's behalf, recording who made it. */
  async function change(
    clientId: string,
    staffEmail: string,
    apply: (subscription: ClientSubscription) => ApiResult<{ next: ClientSubscription; text: string }>
  ): Promise<ApiResult<ClientSubscription>> {
    if (!STUB_CLIENTS.some((client) => client.id === clientId)) return notFound();
    const { changes, byClient } = await subscriptions();
    const current = byClient[clientId];
    if (!current) return refused("This client doesn't have a plan.");

    const result = apply(current);
    if (!result.ok) return result;

    const { payments, ...stored } = result.data.next;
    const entry: ClientHistoryEntry = { id: `${clientId}-${now()}`, at: new Date(now()).toISOString(), text: result.data.text, by: staffEmail };
    await store.write({
      subscriptions: { ...changes.subscriptions, [clientId]: stored },
      history: { ...changes.history, [clientId]: [entry, ...(changes.history[clientId] ?? [])] },
    });
    return ok({ ...stored, payments });
  }

  return {
    async logIn(email, password) {
      const normalized = email.trim().toLowerCase();
      if (normalized === STUB_RULES.lockedEmail) return { ok: false, error: apiError("RATE_LIMITED", 429) };
      if (!normalized.endsWith(STUB_RULES.staffDomain) || password === STUB_RULES.wrongPassword) {
        return { ok: false, error: apiError("UNAUTHENTICATED", 401, { message: "That email and password don't match a team account." }) };
      }
      return ok(challengeFor(normalized, now()));
    },

    async verifyCode(challengeId, code) {
      const challenge = verifyJson<{ email: string; expiresAt: number }>(challengeId, cookieSecret());
      if (!challenge || challenge.expiresAt <= now()) {
        return { ok: false, error: apiError("UNAUTHENTICATED", 401, { message: "That code has expired. Send a new one." }) };
      }
      if (code.trim() !== STUB_RULES.code) {
        return { ok: false, error: apiError("VALIDATION", 422, { message: "That code isn't right. Check it, or send a new one." }) };
      }
      return ok(staffFor(challenge.email));
    },

    async resendCode(challengeId) {
      const challenge = verifyJson<{ email: string }>(challengeId, cookieSecret());
      if (!challenge) return { ok: false, error: apiError("UNAUTHENTICATED", 401) };
      return ok(challengeFor(challenge.email, now()));
    },

    async searchClients({ query, page }) {
      const words = query.trim().toLowerCase();
      const clients = await Promise.all(STUB_CLIENTS.map(liveClient));
      const matches = clients.filter((client) =>
        !words || [client.fullName, client.businessName ?? "", client.email].some((value) => value.toLowerCase().includes(words))
      ).sort((a, b) => b.joinedOn.localeCompare(a.joinedOn));

      const pages = Math.max(1, Math.ceil(matches.length / CLIENTS_PAGE_SIZE));
      const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
      const start = (current - 1) * CLIENTS_PAGE_SIZE;
      return ok({ items: matches.slice(start, start + CLIENTS_PAGE_SIZE).map(summaryOf), total: matches.length, page: current, pageSize: CLIENTS_PAGE_SIZE });
    },

    async getClient(id) {
      const client = STUB_CLIENTS.find((item) => item.id === id);
      return client ? ok(await liveClient(client)) : notFound();
    },

    async sendPasswordReset(id) {
      const client = STUB_CLIENTS.find((item) => item.id === id);
      if (!client) return { ok: false, error: apiError("NOT_FOUND", 404) };
      if (client.signInMethod === "google") {
        return { ok: false, error: apiError("VALIDATION", 422, { message: "This client signs in with Google, so there's no password to reset." }) };
      }
      return ok(null);
    },

    async getCatalogue() {
      return ok(structuredClone(STUB_CATALOGUE));
    },

    async listSubscriptions(filter) {
      const { byClient } = await subscriptions();
      const date = today();
      const entries = Object.entries(byClient);
      const counts = { all: 0, active: 0, renewing: 0, cancelled: 0 };
      for (const id of Object.keys(counts) as SubscriptionFilter[]) {
        counts[id] = entries.filter(([, subscription]) => matchesFilter(subscription, id, date)).length;
      }
      const items: SubscriptionRow[] = entries
        .filter(([, subscription]) => matchesFilter(subscription, filter, date))
        .sort(([, a], [, b]) => a.currentPeriodEnd.localeCompare(b.currentPeriodEnd))
        .map(([clientId, subscription]) => ({
          clientId,
          clientName: STUB_CLIENTS.find((client) => client.id === clientId)!.fullName,
          planName: planNamed(subscription.planId).name,
          pendingPlanName: subscription.pendingPlanId ? planNamed(subscription.pendingPlanId).name : null,
          billingPeriod: subscription.billingPeriod,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          servicesChosen: subscription.serviceIds.length,
          servicesIncluded: servicesIncluded(planNamed(subscription.planId)),
        }));
      return ok({ items, counts });
    },

    async getSubscription(clientId) {
      if (!STUB_CLIENTS.some((client) => client.id === clientId)) return notFound();
      return ok((await subscriptions()).byClient[clientId] ?? null);
    },

    cancelSubscription(clientId, staffEmail) {
      return change(clientId, staffEmail, (current) => {
        if (current.status !== "active") return refused("This plan is already cancelled.");
        return ok({ next: { ...current, status: "cancelled", pendingPlanId: null, reminder: null }, text: "Cancelled the subscription" });
      });
    },

    keepSubscription(clientId, staffEmail) {
      return change(clientId, staffEmail, (current) => {
        if (current.status === "ended") return refused("This plan has already ended, so the client needs to subscribe again.");
        if (current.status !== "cancelled") return refused("This plan isn't cancelled.");
        return ok({
          next: { ...current, status: "active", reminder: reminderFor("active", current.currentPeriodEnd, today()) },
          text: "Kept the plan after it was cancelled",
        });
      });
    },

    updateServices(clientId, serviceIds, staffEmail) {
      return change(clientId, staffEmail, (current) => {
        if (current.status !== "active") return refused("Services can only be changed on an active plan.");
        const plan = planNamed(current.planId);
        const check = checkServiceSelection(serviceChoices(plan, STUB_CATALOGUE, current.serviceIds), current.serviceIds, serviceIds, current.changesLeftThisMonth);
        if (!check.ok) {
          if (check.reason === "too-many") return invalid(`The ${plan.name} plan includes ${check.allowance} ${check.allowance === 1 ? check.group!.unitSingular : check.group!.unitPlural}. Choose fewer.`);
          if (check.reason === "no-changes-left") {
            const left = current.changesLeftThisMonth;
            return invalid(`That would use ${check.changesUsed} ${check.changesUsed === 1 ? "change" : "changes"}, but the client has ${left === 0 ? "none" : left} left this month.`);
          }
          return invalid("Some of those services aren't part of this plan.");
        }
        if (check.changesUsed === 0 && serviceIds.length === current.serviceIds.length && serviceIds.every((id) => current.serviceIds.includes(id))) {
          return invalid("Nothing has changed.");
        }
        return ok({
          next: { ...current, serviceIds, changesLeftThisMonth: current.changesLeftThisMonth - check.changesUsed },
          text: servicesChangeText(current.serviceIds, serviceIds),
        });
      });
    },

    changePlan(clientId, planId, staffEmail) {
      return change(clientId, staffEmail, (current) => {
        if (current.status !== "active") return refused("The plan can only be changed while it's active.");
        if (!pricedPlans(STUB_CATALOGUE).some((plan) => plan.id === planId)) return invalid("Choose Starter, Growth or Pro.");
        const pendingPlanId = planId === current.planId ? null : planId;
        if (pendingPlanId === current.pendingPlanId) return invalid("Nothing has changed.");
        return ok({
          next: { ...current, pendingPlanId },
          text: pendingPlanId ? `Plan changes to ${planNamed(pendingPlanId).name} at the next renewal` : "Cancelled the waiting plan change",
        });
      });
    },
  };
}
