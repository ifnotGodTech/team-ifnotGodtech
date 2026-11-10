import type { Catalogue, GroupDraft, Plan, PlanId, PlanUpdate, Service, ServiceDraft, ServiceGroup, SiteText } from "@/types/catalogue";
import type { Overview } from "@/types/overview";
import type { ApiResult } from "./errors";

/** What the screens need from the backend that isn't built yet. The stand-in provides it until each
 * part moves to the real API. Staff log in already has: see staffAuth.ts. */
export type DashboardBackend = {
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
};
