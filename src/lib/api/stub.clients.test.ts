import { describe, expect, it } from "vitest";
import { CLIENTS_PAGE_SIZE, createStubBackend } from "./stub";
import { STUB_CLIENTS } from "./stubData";

const backend = createStubBackend();

describe("stand-in clients", () => {
  it("lists newest clients first, a page at a time", async () => {
    const result = await backend.searchClients({ query: "", page: 1 });

    expect(result.ok && result.data.total).toBe(STUB_CLIENTS.length);
    expect(result.ok && result.data.items).toHaveLength(CLIENTS_PAGE_SIZE);
    const dates = result.ok ? result.data.items.map((client) => client.joinedOn) : [];
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("returns the rest on the last page, and keeps page numbers in range", async () => {
    const last = await backend.searchClients({ query: "", page: 2 });
    const beyond = await backend.searchClients({ query: "", page: 99 });
    const before = await backend.searchClients({ query: "", page: -3 });

    expect(last.ok && last.data.items).toHaveLength(STUB_CLIENTS.length - CLIENTS_PAGE_SIZE);
    expect(beyond.ok && beyond.data.page).toBe(2);
    expect(before.ok && before.data.page).toBe(1);
  });

  it.each([
    ["a name", "ADA OBI", ["Ada Obi"]],
    ["a business", "pharmacy", ["Chinedu Eze"]],
    ["an email", "belloautos", ["Musa Bello"]],
  ])("searches by %s, ignoring case", async (_, query, names) => {
    const result = await backend.searchClients({ query, page: 1 });

    expect(result.ok && result.data.items.map((client) => client.fullName)).toEqual(names);
  });

  it("returns nothing for a search without matches", async () => {
    expect(await backend.searchClients({ query: "nobody", page: 1 })).toMatchObject({ ok: true, data: { items: [], total: 0 } });
  });

  it("lists only summary fields, leaving phone and history for the details page", async () => {
    const result = await backend.searchClients({ query: "Ada Obi", page: 1 });

    expect(result.ok && Object.keys(result.data.items[0]).sort()).toEqual(["businessName", "email", "fullName", "id", "joinedOn", "planName", "planStatus"]);
  });

  it("gets one client's details, with history", async () => {
    const result = await backend.getClient("c-ada");

    expect(result).toMatchObject({ ok: true, data: { fullName: "Ada Obi", signInMethod: "password", phone: "+234 800 000 0001" } });
    expect(result.ok && result.data.history[0].text).toBe("Subscribed to Growth, monthly");
  });

  it("says when a client doesn't exist", async () => {
    expect(await backend.getClient("nope")).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("sends a password reset only to clients who sign in with a password", async () => {
    expect(await backend.sendPasswordReset("c-ada", "tunde@ifnotgod.com")).toEqual({ ok: true, data: null });
    expect(await backend.sendPasswordReset("c-grace", "tunde@ifnotgod.com")).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
    expect(await backend.sendPasswordReset("nope", "tunde@ifnotgod.com")).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
