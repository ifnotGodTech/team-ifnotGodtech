import type { ReactNode } from "react";

export function PageHeader({ title, intro, actions }: { title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-[1.9rem] font-extrabold">{title}</h1>
        {intro && <p className="text-text-dim">{intro}</p>}
      </div>
      {actions}
    </div>
  );
}
