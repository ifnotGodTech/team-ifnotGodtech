import { readFileSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

// The real backend the browser tests run against. See playwright.config.ts.

export const API_PORT = 8100;
export const BACKEND_DIR = process.env.BACKEND_DIR ?? path.resolve(__dirname, "../../backend");
export const OUTBOX_DIR = path.join(BACKEND_DIR, ".outbox-e2e");
/** Where the test backend writes its seeded clients' ids, by first name (see seed_e2e_dashboard). */
export const SEED_IDS_FILE = path.join(OUTBOX_DIR, "..", ".e2e-dashboard-ids.json");

/** A seeded client's page, such as clientPath("ada", "/services") for /clients/2/services. */
export function clientPath(name: string, rest = ""): string {
  const ids = JSON.parse(readFileSync(SEED_IDS_FILE, "utf8")) as Record<string, number>;
  if (!ids[name]) throw new Error(`No seeded client called ${name}`);
  return `/clients/${ids[name]}${rest}`;
}

/** The signed-in session saved by staff.setup.ts. */
export const STAFF_STATE = path.join(__dirname, ".auth", "staff.json");

/** The one staff account serve_for_e2e.sh creates. */
export const STAFF = { email: "tunde@ifnotgod.com", password: "e2e staff password" };

const SEPARATOR = /^-{79}$/m;

/** Every email the backend has written, oldest first. A file may hold several. */
async function emails(): Promise<string[]> {
  const names = (await readdir(OUTBOX_DIR).catch(() => [])).filter((name) => name.endsWith(".log"));
  const files = await Promise.all(
    names.map(async (name) => ({ name, modified: (await stat(path.join(OUTBOX_DIR, name))).mtimeMs })),
  );
  files.sort((a, b) => a.modified - b.modified || a.name.localeCompare(b.name));
  const contents = await Promise.all(files.map(({ name }) => readFile(path.join(OUTBOX_DIR, name), "utf8")));
  return contents.flatMap((content) => content.split(SEPARATOR)).filter((email) => email.trim());
}

/** The code in the latest log in email to this address. */
export async function latestCode(email = STAFF.email): Promise<string> {
  const sent = (await emails()).filter((message) => message.includes(`To: ${email}`));
  const code = sent.at(-1)?.match(/team dashboard is (\d{6})\./)?.[1];
  if (!code) throw new Error(`No log in code has been emailed to ${email}`);
  return code;
}
