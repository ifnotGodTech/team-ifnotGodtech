import { cn } from "@/shared/cn";

export type StatusTone = "success" | "warning" | "neutral" | "attention";

const TONES: Record<StatusTone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  neutral: "bg-neutral-bg text-text-dim",
  attention: "bg-attention-bg text-maroon",
};

/** A status in words as well as colour, so it reads the same without colour. */
export function StatusBadge({ tone, children }: { tone: StatusTone; children: string }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.81rem] font-bold", TONES[tone])}>{children}</span>;
}
