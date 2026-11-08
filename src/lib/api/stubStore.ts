import { cookies } from "next/headers";
import type { ClientHistoryEntry } from "@/types/client";
import type { ClientSubscription } from "@/types/subscription";
import { cookieSecret, signJson, verifyJson } from "@/lib/auth/signing";

// Where the stand-in keeps changes made on a client's behalf: a signed cookie in the staff
// member's own browser, so each person (and each browser test) sees only their own changes.
// It needs no database, and disappears with the real backend in phase 7.

/** Payments never change here, so they're left out to keep the cookie small. */
export type StoredSubscription = Omit<ClientSubscription, "payments">;

export type StubChanges = {
  subscriptions: Record<string, StoredSubscription>;
  history: Record<string, ClientHistoryEntry[]>;
};

export type StubStore = {
  read(): Promise<StubChanges>;
  write(changes: StubChanges): Promise<void>;
};

const COOKIE = "ifng_stub_changes";
const MAX_AGE_SECONDS = 24 * 60 * 60;

const empty = (): StubChanges => ({ subscriptions: {}, history: {} });

export const cookieStubStore: StubStore = {
  async read() {
    const value = (await cookies()).get(COOKIE)?.value;
    return (value && verifyJson<StubChanges>(value, cookieSecret())) || empty();
  },
  async write(changes) {
    (await cookies()).set(COOKIE, signJson(changes, cookieSecret()), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
  },
};

export function memoryStubStore(): StubStore {
  let changes = empty();
  return {
    async read() {
      return structuredClone(changes);
    },
    async write(next) {
      changes = structuredClone(next);
    },
  };
}
