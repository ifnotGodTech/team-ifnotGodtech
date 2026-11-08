import type { ClientDetail, ClientHistoryEntry, ClientSummary } from "@/types/client";
import type { LoginChallenge, StaffMember } from "@/types/staff";
import type { ClientSubscription, SubscriptionFilter, SubscriptionRow } from "@/types/subscription";
import { cookieSecret, signJson, verifyJson } from "@/lib/auth/signing";
import { checkServiceSelection, paidLabel, pricedPlans, RENEWING_SOON_DAYS, serviceChoices, servicesIncluded } from "@/shared/subscriptions";
import type { DashboardBackend } from "./backend";
import { apiError, type ApiResult } from "./errors";
import type { Catalogue, Plan, Service, ServiceGroup } from "@/types/catalogue";
import { fieldErrorsOf, groupSchema, planUpdateSchema, serviceSchema, siteTextSchema, slugOf } from "@/shared/content";
import { STUB_CATALOGUE, STUB_SITE_TEXT } from "./stubCatalogue";
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
export const RECENT_CHANGES_SHOWN = 8;

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

// Plan names can't be edited, so they're read from the fixed catalogue.
const planNamed = (id: string) => STUB_CATALOGUE.plans.find((plan) => plan.id === id)!;
const livePlan = (catalogue: Catalogue, id: string) => catalogue.plans.find((plan) => plan.id === id)!;
const invalidFields = (fieldErrors: Record<string, string>): ApiResult<never> => ({
  ok: false,
  error: apiError("VALIDATION", 422, { message: "Check the highlighted fields.", fieldErrors }),
});

/** A new id from a name, kept unique among the existing ones. */
function newId(name: string, taken: string[]): string {
  const base = slugOf(name);
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}
const list = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

function servicesChangeText(before: string[], after: string[], catalogue: Catalogue): string {
  const serviceNamed = (id: string) => catalogue.services.find((service) => service.id === id)?.name ?? id;
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

  /** The catalogue with any content changes made through the stand-in. */
  async function liveCatalogue(): Promise<Catalogue> {
    const changes = await store.readContent();
    const merge = <T extends { id: string }>(base: T[], changed: Record<string, T>) => [
      ...base.map((item) => changed[item.id] ?? item),
      ...Object.values(changed).filter((item) => !base.some((original) => original.id === item.id)),
    ];
    return structuredClone({
      plans: STUB_CATALOGUE.plans.map((plan) => changes.plans[plan.id] ?? plan),
      groups: merge(STUB_CATALOGUE.groups, changes.groups),
      services: merge(STUB_CATALOGUE.services, changes.services),
    });
  }

  async function saveContent(update: (changes: Awaited<ReturnType<StubStore["readContent"]>>) => void) {
    const changes = await store.readContent();
    update(changes);
    await store.writeContent(changes);
  }

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
    apply: (subscription: ClientSubscription, catalogue: Catalogue) => ApiResult<{ next: ClientSubscription; text: string }>
  ): Promise<ApiResult<ClientSubscription>> {
    if (!STUB_CLIENTS.some((client) => client.id === clientId)) return notFound();
    const { changes, byClient } = await subscriptions();
    const current = byClient[clientId];
    if (!current) return refused("This client doesn't have a plan.");

    const result = apply(current, await liveCatalogue());
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

    async searchClients({ query, page, withoutPlan = false }) {
      const words = query.trim().toLowerCase();
      const clients = await Promise.all(STUB_CLIENTS.map(liveClient));
      const matches = clients.filter((client) =>
        (!withoutPlan || client.planStatus === "none") && (!words || [client.fullName, client.businessName ?? "", client.email].some((value) => value.toLowerCase().includes(words)))
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

    async getOverview() {
      const { byClient } = await subscriptions();
      const catalogue = await liveCatalogue();
      const date = today();
      const clients = await Promise.all(STUB_CLIENTS.map(liveClient));
      const entries = Object.entries(byClient);
      const active = entries.filter(([, subscription]) => subscription.status === "active");
      const cancelledEnds = entries
        .filter(([, subscription]) => subscription.status === "cancelled")
        .map(([, subscription]) => subscription.currentPeriodEnd)
        .sort();

      return ok({
        activeSubscriptions: active.length,
        monthlyIncome: active.reduce((sum, [, subscription]) => sum + (livePlan(catalogue, subscription.planId).monthlyPrice ?? 0), 0),
        renewingSoon: active
          .filter(([, subscription]) => matchesFilter(subscription, "renewing", date))
          .sort(([, a], [, b]) => a.currentPeriodEnd.localeCompare(b.currentPeriodEnd))
          .map(([clientId, subscription]) => ({
            clientId,
            clientName: clients.find((client) => client.id === clientId)!.fullName,
            planName: planNamed(subscription.planId).name,
            billingPeriod: subscription.billingPeriod,
            renewsOn: subscription.currentPeriodEnd,
            reminder: subscription.reminder,
          })),
        cancelledStillRunning: cancelledEnds.length,
        nextCancellationEnds: cancelledEnds[0] ?? null,
        clientsWithoutPlan: clients.filter((client) => client.planStatus === "none").length,
        recentChanges: clients
          .flatMap((client) => client.history.map((entry) => ({ ...entry, clientId: client.id, clientName: client.fullName })))
          .sort((a, b) => b.at.localeCompare(a.at))
          .slice(0, RECENT_CHANGES_SHOWN),
      });
    },

    async getCatalogue() {
      return ok(await liveCatalogue());
    },

    async listSubscriptions(filter) {
      const { byClient } = await subscriptions();
      const catalogue = await liveCatalogue();
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
          servicesIncluded: servicesIncluded(livePlan(catalogue, subscription.planId)),
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
      return change(clientId, staffEmail, (current, catalogue) => {
        if (current.status !== "active") return refused("Services can only be changed on an active plan.");
        const plan = livePlan(catalogue, current.planId);
        const check = checkServiceSelection(serviceChoices(plan, catalogue, current.serviceIds), current.serviceIds, serviceIds, current.changesLeftThisMonth);
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
          text: servicesChangeText(current.serviceIds, serviceIds, catalogue),
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

    async savePlan(planId, input) {
      const parsed = planUpdateSchema.safeParse(input);
      if (!parsed.success) return invalidFields(fieldErrorsOf(parsed.error));
      const update = parsed.data;
      const catalogue = await liveCatalogue();
      const plan = catalogue.plans.find((item) => item.id === planId);
      if (!plan) return notFound();
      if (plan.monthlyPrice === null) return refused("Custom is quoted after the audit, so it has no price to edit.");
      const unknownGroup = Object.keys(update.allowances).find((id) => !catalogue.groups.some((group) => group.id === id));
      if (unknownGroup) return invalid("One of those groups no longer exists. Reload the page and try again.");

      const saved: Plan = { ...plan, ...structuredClone(update) };
      await saveContent((changes) => {
        if (update.recommended) {
          for (const other of catalogue.plans) {
            if (other.id !== planId && other.recommended) changes.plans[other.id] = { ...other, recommended: false };
          }
        }
        changes.plans[planId] = saved;
      });
      return ok(saved);
    },

    async saveService(draft) {
      const parsed = serviceSchema.safeParse(draft);
      if (!parsed.success) return invalidFields(fieldErrorsOf(parsed.error));
      const catalogue = await liveCatalogue();
      if (!catalogue.groups.some((group) => group.id === parsed.data.group)) return invalidFields({ group: "Choose a group." });
      const sameName = catalogue.services.find((service) => service.name.toLowerCase() === parsed.data.name.toLowerCase() && service.id !== draft.id);
      if (sameName) return invalidFields({ name: `There's already a service called ${sameName.name}.` });

      const existing = draft.id ? catalogue.services.find((service) => service.id === draft.id) : undefined;
      if (draft.id && !existing) return notFound();
      const saved: Service = {
        id: existing?.id ?? newId(parsed.data.name, catalogue.services.map((service) => service.id)),
        name: parsed.data.name,
        problem: parsed.data.problem,
        group: parsed.data.group,
        plans: parsed.data.plans,
        available: existing?.available ?? true,
      };
      await saveContent((changes) => {
        changes.services[saved.id] = saved;
      });
      return ok(saved);
    },

    async setServiceShown(serviceId, shown) {
      const service = (await liveCatalogue()).services.find((item) => item.id === serviceId);
      if (!service) return notFound();
      const saved = { ...service, available: shown };
      await saveContent((changes) => {
        changes.services[serviceId] = saved;
      });
      return ok(saved);
    },

    async saveGroup(draft) {
      const parsed = groupSchema.safeParse(draft);
      if (!parsed.success) return invalidFields(fieldErrorsOf(parsed.error));
      const catalogue = await liveCatalogue();
      const sameName = catalogue.groups.find((group) => group.name.toLowerCase() === parsed.data.name.toLowerCase() && group.id !== draft.id);
      if (sameName) return invalidFields({ name: `There's already a group called ${sameName.name}.` });
      if (draft.id && !catalogue.groups.some((group) => group.id === draft.id)) return notFound();

      const saved: ServiceGroup = {
        id: draft.id ?? newId(parsed.data.name, catalogue.groups.map((group) => group.id)),
        name: parsed.data.name,
        unitSingular: parsed.data.unitSingular,
        unitPlural: parsed.data.unitPlural,
      };
      await saveContent((changes) => {
        changes.groups[saved.id] = saved;
      });
      return ok(saved);
    },

    async getSiteText() {
      return ok((await store.readContent()).siteText ?? structuredClone(STUB_SITE_TEXT));
    },

    async saveSiteText(text) {
      const parsed = siteTextSchema.safeParse(text);
      if (!parsed.success) return invalidFields(fieldErrorsOf(parsed.error));
      await saveContent((changes) => {
        changes.siteText = parsed.data;
      });
      return ok(parsed.data);
    },
  };
}
