import type { Catalogue, GroupDraft, Plan, PlanId, PlanUpdate, Service, ServiceDraft, ServiceGroup, SiteText } from "@/types/catalogue";
import type { ClientDetail, ClientPage, ClientSearch } from "@/types/client";
import type { Overview } from "@/types/overview";
import type { ClientSubscription, SubscriptionFilter, SubscriptionList } from "@/types/subscription";
import type { ApiResult } from "./errors";

/** What the screens need from the backend that isn't built yet. The stand-in provides it until each
 * part moves to the real API. Staff log in already has: see staffAuth.ts. */
export type DashboardBackend = {
  /** Searches by name, business or email, newest clients first. */
  searchClients(search: ClientSearch): Promise<ApiResult<ClientPage>>;
  getClient(id: string): Promise<ApiResult<ClientDetail>>;
  /** Emails the client a link to set a new password. Only for clients who sign in with a password. */
  sendPasswordReset(id: string, staffEmail: string): Promise<ApiResult<null>>;

  /** Counts, upcoming renewals and recent changes for the overview page. */
  getOverview(): Promise<ApiResult<Overview>>;

  /** Plans and services, as the website shows them. */
  getCatalogue(): Promise<ApiResult<Catalogue>>;

  // Site content. Each save tells WEB to refresh its cached pages, and records who made it.
  /** At most one plan is recommended, so recommending one stops recommending the others. */
  savePlan(planId: PlanId, update: PlanUpdate, staffEmail: string): Promise<ApiResult<Plan>>;
  /** Adds a service when its id is null, otherwise updates it. */
  saveService(draft: ServiceDraft, staffEmail: string): Promise<ApiResult<Service>>;
  /** Hidden services stay running for clients who already have them. */
  setServiceShown(serviceId: string, shown: boolean, staffEmail: string): Promise<ApiResult<Service>>;
  /** Adds a group when its id is null, otherwise renames it. */
  saveGroup(draft: GroupDraft, staffEmail: string): Promise<ApiResult<ServiceGroup>>;
  getSiteText(): Promise<ApiResult<SiteText>>;
  saveSiteText(text: SiteText, staffEmail: string): Promise<ApiResult<SiteText>>;
  /** Soonest renewal or end first, with a count for each filter. */
  listSubscriptions(filter: SubscriptionFilter): Promise<ApiResult<SubscriptionList>>;
  /** Null for a client without a plan. */
  getSubscription(clientId: string): Promise<ApiResult<ClientSubscription | null>>;

  // Changes on a client's behalf. The backend applies the same rules as for clients, records
  // who made each change, and emails the client to confirm it.
  /** Stops the plan renewing. Everything keeps working to the end of the paid period. */
  cancelSubscription(clientId: string, staffEmail: string): Promise<ApiResult<ClientSubscription>>;
  /** Undoes a cancellation while the paid period is still running. */
  keepSubscription(clientId: string, staffEmail: string): Promise<ApiResult<ClientSubscription>>;
  /** Each service added in place of another uses one of the month's changes. */
  updateServices(clientId: string, serviceIds: string[], staffEmail: string): Promise<ApiResult<ClientSubscription>>;
  /** Starts at the next renewal. Choosing the current plan drops a waiting change. */
  changePlan(clientId: string, planId: PlanId, staffEmail: string): Promise<ApiResult<ClientSubscription>>;
};
