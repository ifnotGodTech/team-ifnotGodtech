import { describe, expect, it } from "vitest";
import { CODE_LIFETIME_MS, createStubBackend, STUB_RULES } from "./stub";

describe("stand-in log in", () => {
  const backend = createStubBackend(() => 0);

  it("emails a code to any team address", async () => {
    const result = await backend.logIn(" Tunde@IFNOTGOD.com ", "a password");

    expect(result).toMatchObject({ ok: true, data: { sentTo: "tunde@ifnotgod.com", expiresAt: new Date(CODE_LIFETIME_MS).toISOString() } });
  });

  it.each([
    ["an outside address", "ada@gmail.com", "a password", "UNAUTHENTICATED"],
    ["the wrong password", "tunde@ifnotgod.com", STUB_RULES.wrongPassword, "UNAUTHENTICATED"],
    ["a locked account", STUB_RULES.lockedEmail, "a password", "RATE_LIMITED"],
  ])("refuses %s", async (_, email, password, code) => {
    expect(await backend.logIn(email, password)).toMatchObject({ ok: false, error: { code } });
  });

  it("signs in with the right code, naming the staff member", async () => {
    const challenge = await backend.logIn("tunde.ade@ifnotgod.com", "x");

    expect(challenge.ok && (await backend.verifyCode(challenge.data.challengeId, STUB_RULES.code))).toMatchObject({
      ok: true,
      data: { name: "Tunde Ade", email: "tunde.ade@ifnotgod.com" },
    });
  });

  it("refuses a wrong code, and an expired one", async () => {
    const challenge = await backend.logIn("tunde@ifnotgod.com", "x");
    if (!challenge.ok) throw new Error("no challenge");

    expect(await backend.verifyCode(challenge.data.challengeId, "000000")).toMatchObject({ ok: false, error: { code: "VALIDATION" } });

    const later = createStubBackend(() => CODE_LIFETIME_MS + 1);
    expect(await later.verifyCode(challenge.data.challengeId, STUB_RULES.code)).toMatchObject({
      ok: false,
      error: { message: "That code has expired. Send a new one." },
    });
  });

  it("refuses a made-up challenge", async () => {
    expect(await backend.verifyCode("made.up", STUB_RULES.code)).toMatchObject({ ok: false });
    expect(await backend.resendCode("made.up")).toMatchObject({ ok: false });
  });
});
