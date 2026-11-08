import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-[10px] border border-dashed border-field bg-card px-6 py-8">
      <h2 className="text-[1.15rem] font-extrabold">{title}</h2>
      {children && <div className="text-text-dim">{children}</div>}
    </div>
  );
}

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-[10px] border border-maroon bg-maroon-tint px-6 py-5">
      <p className="font-semibold text-maroon">{message}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">{label}…</span>
      {[0, 1, 2].map((row) => (
        <div key={row} aria-hidden className="h-12 animate-pulse rounded-md bg-line-soft" />
      ))}
    </div>
  );
}
