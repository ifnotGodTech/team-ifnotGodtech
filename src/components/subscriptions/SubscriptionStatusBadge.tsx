import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import type { SubscriptionStatus } from "@/types/subscription";

const LABELS: Record<SubscriptionStatus, [string, StatusTone]> = {
  active: ["Active", "success"],
  cancelled: ["Cancelled", "warning"],
  ended: ["Ended", "neutral"],
};

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  const [label, tone] = LABELS[status];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
