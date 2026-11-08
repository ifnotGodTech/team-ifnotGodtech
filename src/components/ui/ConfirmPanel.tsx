"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";

type ConfirmPanelProps = {
  /** The button that opens the panel, such as "Cancel subscription". */
  triggerLabel: string;
  title: string;
  /** Exactly what will happen if confirmed. */
  children: ReactNode;
  confirmLabel: string;
  /** Runs on confirm. A server action can be passed straight in. */
  action: (form: FormData) => void | Promise<void>;
  /** Hidden fields sent with the confirmation, such as an id. */
  fields?: Record<string, string>;
};

/** Asks before anything hard to undo, saying exactly what will happen. */
export function ConfirmPanel({ triggerLabel, title, children, confirmLabel, action, fields = {} }: ConfirmPanelProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) headingRef.current?.focus();
    else if (wasOpen.current) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  if (!open) {
    return (
      <Button ref={triggerRef} variant="secondary" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-labelledby={headingId}
      onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
      className="flex flex-col gap-3 rounded-[10px] border-2 border-maroon bg-maroon-tint px-5 py-4.5"
    >
      <h3 id={headingId} ref={headingRef} tabIndex={-1} className="text-[1.1rem] font-extrabold">
        {title}
      </h3>
      <div className="text-text">{children}</div>
      <form action={action} className="flex flex-wrap gap-2.5">
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Button type="submit">{confirmLabel}</Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Go back
        </Button>
      </form>
    </div>
  );
}
