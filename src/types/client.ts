// The contract with the backend's clients API. The stand-in in src/lib/api follows it.

export type ClientPlanStatus = "active" | "cancelled" | "none";

export type ClientSummary = {
  id: string;
  fullName: string;
  businessName?: string;
  email: string;
  /** The plan's name, or null for a client without a plan. */
  planName: string | null;
  planStatus: ClientPlanStatus;
  /** ISO date. */
  joinedOn: string;
};

export type ClientHistoryEntry = {
  id: string;
  /** ISO date-time. */
  at: string;
  text: string;
  /** Who made the change: "the client", "automatic", or a staff email. */
  by: string;
};

export type ClientDetail = ClientSummary & {
  phone?: string;
  signInMethod: "password" | "google";
  history: ClientHistoryEntry[];
};

export type ClientPage = {
  items: ClientSummary[];
  total: number;
  /** Starts at 1. */
  page: number;
  pageSize: number;
};

export type ClientSearch = {
  query: string;
  page: number;
  /** Only clients who have signed up but not subscribed, or whose plan has ended. */
  withoutPlan?: boolean;
};
