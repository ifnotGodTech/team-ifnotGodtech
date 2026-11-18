import type { StatusTone } from "@/components/ui/StatusBadge";
import type { LeadFilter, LeadStatus } from "@/types/lead";

export const LEAD_FILTERS: readonly { id: LeadFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "closed", label: "Closed" },
];

export const LEAD_STATUS: Record<LeadStatus, { label: string; tone: StatusTone }> = {
  new: { label: "New", tone: "attention" },
  contacted: { label: "Contacted", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

export const isLeadFilter = (value: unknown): value is LeadFilter => LEAD_FILTERS.some((filter) => filter.id === value);
export const isLeadStatus = (value: unknown): value is LeadStatus => value === "new" || value === "contacted" || value === "closed";

export const LEADS_PAGE_SIZE = 20;
