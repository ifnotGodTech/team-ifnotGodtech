import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import type { ClientPlanStatus } from "@/types/client";

const LABELS: Record<ClientPlanStatus, [string, StatusTone]> = {
  active: ["Active", "success"],
  cancelled: ["Cancelled", "warning"],
  none: ["No plan", "neutral"],
};

export function PlanStatusBadge({ status }: { status: ClientPlanStatus }) {
  const [label, tone] = LABELS[status];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
