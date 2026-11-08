import type { Catalogue, PlanId } from "@/types/catalogue";
import type { ClientDetail, ClientPage, ClientSearch } from "@/types/client";
import type { ClientSubscription, SubscriptionFilter, SubscriptionList } from "@/types/subscription";
import type { LoginChallenge, StaffMember } from "@/types/staff";
import type { ApiResult } from "./errors";

/** What the screens need from the backend. The stand-in and, in phase 7, the real API both provide it. */
export type DashboardBackend = {
  /** Checks the password and emails a 6-digit code. */
  logIn(email: string, password: string): Promise<ApiResult<LoginChallenge>>;
  verifyCode(challengeId: string, code: string): Promise<ApiResult<StaffMember>>;
  resendCode(challengeId: string): Promise<ApiResult<LoginChallenge>>;

  /** Searches by name, business or email, newest clients first. */
  searchClients(search: ClientSearch): Promise<ApiResult<ClientPage>>;
  getClient(id: string): Promise<ApiResult<ClientDetail>>;
  /** Emails the client a link to set a new password. Only for clients who sign in with a password. */
  sendPasswordReset(id: string, staffEmail: string): Promise<ApiResult<null>>;

  /** Plans and services, as the website shows them. */
  getCatalogue(): Promise<ApiResult<Catalogue>>;
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
