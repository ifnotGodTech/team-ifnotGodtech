import { cookies } from "next/headers";
import type { Plan, PlanId, Service, ServiceGroup, SiteText } from "@/types/catalogue";
import type { ClientHistoryEntry } from "@/types/client";
import type { ClientSubscription } from "@/types/subscription";
import { cookieSecret, signJson, verifyJson } from "@/lib/auth/signing";

// Where the stand-in keeps changes made on a client's behalf: a signed cookie in the staff
// member's own browser, so each person (and each browser test) sees only their own changes.
// It needs no database, and goes once every screen uses the real backend.

/** Payments never change here, so they're left out to keep the cookie small. */
export type StoredSubscription = Omit<ClientSubscription, "payments">;

export type StubChanges = {
  subscriptions: Record<string, StoredSubscription>;
  history: Record<string, ClientHistoryEntry[]>;
};

/** Site content changes: only what changed, by id, to keep the cookie small. */
export type ContentChanges = {
  plans: Partial<Record<PlanId, Plan>>;
  services: Record<string, Service>;
  groups: Record<string, ServiceGroup>;
  siteText: SiteText | null;
};

export type StubStore = {
  read(): Promise<StubChanges>;
  write(changes: StubChanges): Promise<void>;
  readContent(): Promise<ContentChanges>;
  writeContent(changes: ContentChanges): Promise<void>;
};

const COOKIE = "ifng_stub_changes";
const CONTENT_COOKIE = "ifng_stub_content";
const MAX_AGE_SECONDS = 24 * 60 * 60;

const empty = (): StubChanges => ({ subscriptions: {}, history: {} });
const emptyContent = (): ContentChanges => ({ plans: {}, services: {}, groups: {}, siteText: null });

async function readCookie<T>(name: string): Promise<T | null> {
  const value = (await cookies()).get(name)?.value;
  return value ? verifyJson<T>(value, cookieSecret()) : null;
}

async function writeCookie(name: string, data: unknown) {
  (await cookies()).set(name, signJson(data, cookieSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export const cookieStubStore: StubStore = {
  read: async () => (await readCookie<StubChanges>(COOKIE)) ?? empty(),
  write: (changes) => writeCookie(COOKIE, changes),
  readContent: async () => (await readCookie<ContentChanges>(CONTENT_COOKIE)) ?? emptyContent(),
  writeContent: (changes) => writeCookie(CONTENT_COOKIE, changes),
};

export function memoryStubStore(): StubStore {
  let changes = empty();
  let content = emptyContent();
  return {
    read: async () => structuredClone(changes),
    write: async (next) => {
      changes = structuredClone(next);
    },
    readContent: async () => structuredClone(content),
    writeContent: async (next) => {
      content = structuredClone(next);
    },
  };
}
