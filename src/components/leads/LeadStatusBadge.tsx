import { StatusBadge } from "@/components/ui/StatusBadge";
import { LEAD_STATUS } from "@/shared/leads";
import type { LeadStatus } from "@/types/lead";

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <StatusBadge tone={LEAD_STATUS[status].tone}>{LEAD_STATUS[status].label}</StatusBadge>;
}
