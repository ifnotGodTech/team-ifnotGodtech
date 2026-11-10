// The contract with the backend's leads API: free audit requests from the website.

export type LeadStatus = "new" | "contacted" | "closed";
export type LeadFilter = "all" | LeadStatus;

export type LeadSummary = {
  id: string;
  fullName: string;
  /** Their business or brand, if they gave one. */
  organisation: string | null;
  /** The plan they said they're interested in, or null for "not sure yet". */
  planName: string | null;
  /** ISO date-time. */
  receivedAt: string;
  status: LeadStatus;
};

export type LeadDetail = LeadSummary & {
  email: string;
  phone: string | null;
  /** The task or problem, in their words. */
  challenge: string;
  /** ISO date it's deleted, 24 months after it came in. */
  deletedOn: string;
};

export type LeadList = {
  items: LeadSummary[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<LeadFilter, number>;
};
