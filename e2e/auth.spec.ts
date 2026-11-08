import { expect, test } from "@playwright/test";
import { logIn, STAND_IN_CODE } from "./helpers";

async function submitPassword(page: import("@playwright/test").Page, email = "tunde@ifnotgod.com") {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Continue" }).click();
}

async function reachCodeStep(page: import("@playwright/test").Page) {
  await submitPassword(page);
  await page.waitForURL(/\/login\/code$/);
}

test("signed-out visitors are sent to log in, then back to where they were going", async ({ page }) => {
  await page.goto("/subscriptions");
  await expect(page).toHaveURL(/\/login\?next=%2Fsubscriptions$/);

  await page.getByLabel("Work email").fill("tunde@ifnotgod.com");
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Code", { exact: true }).fill(STAND_IN_CODE);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/subscriptions$/);
  await expect(page.getByText("Signed in as tunde@ifnotgod.com")).toBeVisible();
});

test("the code step says where the code went", async ({ page }) => {
  await reachCodeStep(page);

  await expect(page.getByText(/sent a 6-digit code to tunde@ifnotgod.com. It expires in 10 minutes/)).toBeVisible();
});

test("a wrong password is explained, keeping the email", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("tunde@ifnotgod.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.locator("main form").getByRole("alert")).toHaveText("That email and password don't match a team account.");
  await expect(page.getByLabel("Work email")).toHaveValue("tunde@ifnotgod.com");
});

test("a locked account is explained", async ({ page }) => {
  await submitPassword(page, "locked@ifnotgod.com");

  await expect(page.locator("main form").getByRole("alert")).toContainText("Too many attempts");
});

test("a wrong code is explained, and 5 wrong codes start the log in again", async ({ page }) => {
  await reachCodeStep(page);

  // Each attempt shows the same message, so wait for each one's response before the next.
  // React clears the form after each attempt, so wait for that before typing the next code.
  const tryCode = async () => {
    const field = page.getByLabel("Code", { exact: true });
    await expect(field).toHaveValue("");
    await field.fill("000000");
    await expect(field).toHaveValue("000000");
    await Promise.all([
      page.waitForResponse((response) => response.request().method() === "POST"),
      page.getByRole("button", { name: "Log in" }).click(),
    ]);
  };

  for (let attempt = 1; attempt <= 4; attempt++) {
    await tryCode();
    await expect(page.locator("main form").getByRole("alert")).toHaveText("That code isn't right. Check it, or send a new one.");
  }
  await tryCode();

  await expect(page).toHaveURL(/\/login\?reason=too-many-codes$/);
  await expect(page.locator("main form").getByRole("status")).toHaveText("Too many wrong codes. Please log in again.");
});

test("a new code can be sent", async ({ page }) => {
  await reachCodeStep(page);

  await page.getByRole("button", { name: "Send a new code" }).click();

  await expect(page.getByText("We've sent a new code. Use the latest one.")).toBeVisible();
});

test("the code page sends people without a log in in progress back to log in", async ({ page }) => {
  await page.goto("/login/code");

  await expect(page).toHaveURL(/\/login$/);
});

test("logging out ends the session, even if an old session cookie comes back", async ({ page, context }) => {
  await logIn(page);
  const before = (await context.cookies()).find((cookie) => cookie.name === "ifng_staff")!;

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login\?reason=signed-out$/);
  await expect(page.getByRole("status")).toHaveText("You've logged out.");

  await page.goto("/clients");
  await expect(page).toHaveURL(/\/login\?next=%2Fclients$/);

  // As if a page that was loading when they logged out had sent back a refreshed session.
  await context.addCookies([before]);
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/login\?next=%2Fclients$/);
});

test("the session cookie can't be read by scripts, and a forged one is refused", async ({ page, context }) => {
  await logIn(page);
  const cookie = (await context.cookies()).find((item) => item.name === "ifng_staff");
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax" });
  expect(await page.evaluate(() => document.cookie)).not.toContain("ifng_staff");

  // Leave the page first, so no request still loading can bring back a real session cookie.
  await page.goto("about:blank");
  await context.clearCookies();
  await context.addCookies([{ name: "ifng_staff", value: "forged.value", url: "http://localhost:3200" }]);
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/login\?next=%2Fclients$/);
});

test("signed-in staff skip the log in page", async ({ page }) => {
  await logIn(page);

  await page.goto("/login");

  await expect(page).toHaveURL(/localhost:3200\/$/);
});

test("a link can't send someone to another website after logging in", async ({ page }) => {
  await reachCodeStep(page);
  await page.goto("/login?next=https://evil.example");
  await page.getByLabel("Work email").fill("tunde@ifnotgod.com");
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Code", { exact: true }).fill(STAND_IN_CODE);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/localhost:3200\/$/);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("logging in still works", async ({ page }) => {
    await logIn(page, "/clients");

    await expect(page.getByRole("heading", { level: 1, name: "Clients" })).toBeVisible();
  });
});
