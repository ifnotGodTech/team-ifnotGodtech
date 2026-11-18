import { expect, test, type Page } from "@playwright/test";
import { latestCode, STAFF } from "./backend";
import { enterEmailedCode, logInWithForm, submitPassword } from "./helpers";

// Log in against the real backend, starting signed out.
test.use({ storageState: { cookies: [], origins: [] } });

async function reachCodeStep(page: Page) {
  await page.goto("/login");
  await submitPassword(page);
  await page.waitForURL(/\/login\/code$/);
}

/** Submits a form and waits for the server's answer, since repeated attempts show the same message. */
async function submitAndWait(page: Page, button: string) {
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    page.getByRole("button", { name: button }).click(),
  ]);
}

test("signed-out visitors are sent to log in, then back to where they were going", async ({ page }) => {
  await page.goto("/subscriptions");
  await expect(page).toHaveURL(/\/login\?next=%2Fsubscriptions$/);

  await submitPassword(page);
  await enterEmailedCode(page);

  await expect(page).toHaveURL(/\/subscriptions$/);
  await expect(page.getByText(`Signed in as ${STAFF.email}`)).toBeVisible();
});

test("the code step says where the code went", async ({ page }) => {
  await reachCodeStep(page);

  await expect(page.getByText(/sent a 6-digit code to tunde@ifnotgod.com. It expires in 10 minutes/)).toBeVisible();
});

test("a wrong password is explained, keeping the email", async ({ page }) => {
  await page.goto("/login");
  await submitPassword(page, { password: "not the password" });

  await expect(page.locator("main form").getByRole("alert")).toHaveText("That email and password don't match a team account.");
  await expect(page.getByLabel("Work email")).toHaveValue(STAFF.email);
});

test("an account is locked after 5 wrong passwords, without saying whether it exists", async ({ page }) => {
  await page.goto("/login");
  const alert = page.locator("main form").getByRole("alert");
  // React clears the password after each attempt, so wait for that before typing the next one.
  const tryPassword = async () => {
    const password = page.getByLabel("Password", { exact: true });
    await expect(password).toHaveValue("");
    await page.getByLabel("Work email").fill("lockout@ifnotgod.com");
    await password.fill("a guess");
    await submitAndWait(page, "Continue");
  };

  for (let attempt = 1; attempt <= 5; attempt++) {
    await tryPassword();
    await expect(alert).toHaveText("That email and password don't match a team account.");
  }
  await tryPassword();

  await expect(alert).toContainText("Too many attempts");
});

test("a wrong code is explained, and 5 wrong codes start the log in again", async ({ page }) => {
  await reachCodeStep(page);

  // React clears the form after each attempt, so wait for that before typing the next code.
  const tryCode = async () => {
    const field = page.getByLabel("Code", { exact: true });
    await expect(field).toHaveValue("");
    await field.fill("000000");
    await expect(field).toHaveValue("000000");
    await submitAndWait(page, "Log in");
  };

  for (let attempt = 1; attempt <= 4; attempt++) {
    await tryCode();
    await expect(page.locator("main form").getByRole("alert")).toHaveText("That code isn't right. Check it, or send a new one.");
  }
  await tryCode();

  await expect(page).toHaveURL(/\/login\?reason=too-many-codes$/);
  await expect(page.locator("main form").getByRole("status")).toHaveText("Too many wrong codes. Please log in again.");
});

test("a new code can be sent, and replaces the first", async ({ page }) => {
  await reachCodeStep(page);
  const first = await latestCode();

  await page.getByRole("button", { name: "Send a new code" }).click();
  await expect(page.getByText("We've sent a new code. Use the latest one.")).toBeVisible();
  const second = await latestCode();

  if (first !== second) {
    await page.getByLabel("Code", { exact: true }).fill(first);
    await submitAndWait(page, "Log in");
    await expect(page.locator("main form").getByRole("alert")).toHaveText("That code isn't right. Check it, or send a new one.");
  }
  await page.getByLabel("Code", { exact: true }).fill(second);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/localhost:3200\/$/);
});

test("the code page sends people without a log in in progress back to log in", async ({ page }) => {
  await page.goto("/login/code");

  await expect(page).toHaveURL(/\/login$/);
});

test("logging out ends the session everywhere, even if an old session cookie comes back", async ({ page, context }) => {
  await logInWithForm(page);
  const before = (await context.cookies()).find((cookie) => cookie.name === "ifng_staff")!;

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login\?reason=signed-out$/);
  await expect(page.getByRole("status")).toHaveText("You've logged out.");

  // A request still loading during log out can bring the cookie back, but its token is revoked, so
  // either way the next page is log in.
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/login\?(next=%2Fclients|reason=expired)$/);

  // A copy of the cookie still holds the token, but the backend revoked it on log out.
  await context.addCookies([before]);
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/login\?reason=expired$/);
  await expect(page.getByLabel("Work email")).toBeVisible();
});

test("the session cookie can't be read by scripts, and a forged one is refused", async ({ page, context }) => {
  await logInWithForm(page);
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
  await logInWithForm(page);

  await page.goto("/login");

  await expect(page).toHaveURL(/localhost:3200\/$/);
});

test("a link can't send someone to another website after logging in", async ({ page }) => {
  await page.goto("/login?next=https://evil.example");
  await submitPassword(page);
  await enterEmailedCode(page);

  await expect(page).toHaveURL(/localhost:3200\/$/);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  // Log in works without JavaScript. The signed-in page it opens streams in behind the loading screen once
  // the backend answers, which needs JavaScript, so this checks only that log in reached it.
  test("logging in still works", async ({ page }) => {
    await logInWithForm(page, "/clients");
  });
});
