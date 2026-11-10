import type { ClientDetail, ClientHistoryEntry } from "@/types/client";
import type { ClientSubscription, SubscriptionFilter } from "@/types/subscription";
import { paidLabel, RENEWING_SOON_DAYS } from "@/shared/subscriptions";
import type { DashboardBackend } from "./backend";
import { apiError, type ApiResult } from "./errors";
import type { Catalogue, Plan, Service, ServiceGroup } from "@/types/catalogue";
import { fieldErrorsOf, groupSchema, planUpdateSchema, serviceSchema, siteTextSchema, slugOf } from "@/shared/content";
import { STUB_CATALOGUE, STUB_SITE_TEXT } from "./stubCatalogue";
import { STUB_CLIENTS } from "./stubData";
import { cookieStubStore, type StubChanges, type StubStore } from "./stubStore";
import { addDays, lagosToday, seedSubscriptions } from "./stubSubscriptions";

// A stand-in for the parts of the backend not built yet. Staff log in already uses the real API
// (src/lib/api/staffAuth.ts). Changes made here live in cookies, and no email is sent.
export const CLIENTS_PAGE_SIZE = 10;
export const RECENT_CHANGES_SHOWN = 8;

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

  return {
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
