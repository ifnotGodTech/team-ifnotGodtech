"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { IDLE_LIMIT_MS, WARNING_BEFORE_MS } from "@/lib/auth/constants";
import { loginPath } from "@/lib/auth/paths";

type SessionTimerProps = {
  /** When the session ends, as milliseconds since 1970. */
  expiresAt: number;
  keepAlive: () => Promise<number>;
};

export const CHECK_EVERY_MS = 10_000;

/** Warns 5 minutes before the session ends, and sends the person to log in when it does. */
export function SessionTimer({ expiresAt, keepAlive }: SessionTimerProps) {
  const pathname = usePathname();
  // `now` stays null until the first check, so nothing shows before the clock has been read.
  const [clock, setClock] = useState<{ now: number | null; expiresAt: number }>({ now: null, expiresAt });
  const openedPageAt = useRef<number | null>(null);
  const firstPath = useRef(pathname);

  // Opening a page goes through the proxy, which restarts the hour.
  useEffect(() => {
    if (pathname !== firstPath.current) openedPageAt.current = Date.now();
  }, [pathname]);

  useEffect(() => {
    const tick = () =>
      setClock((previous) => ({
        now: Date.now(),
        expiresAt:
          openedPageAt.current === null ? previous.expiresAt : Math.max(previous.expiresAt, openedPageAt.current + IDLE_LIMIT_MS),
      }));
    tick();
    const timer = setInterval(tick, CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, []);

  const remaining = clock.now === null ? Infinity : clock.expiresAt - clock.now;

  useEffect(() => {
    if (remaining <= 0) window.location.assign(loginPath(pathname, "expired"));
  }, [remaining, pathname]);

  if (remaining > WARNING_BEFORE_MS || remaining <= 0) return null;

  const minutes = Math.max(1, Math.ceil(remaining / 60_000));
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-orange bg-warning-bg px-5 py-3.5">
      <p className="font-semibold text-warning">
        Your session ends in {minutes} {minutes === 1 ? "minute" : "minutes"}. Save your work, or stay signed in.
      </p>
      <Button
        onClick={async () => {
          const renewed = await keepAlive();
          setClock({ now: Date.now(), expiresAt: renewed });
        }}
      >
        Stay signed in
      </Button>
    </div>
  );
}
