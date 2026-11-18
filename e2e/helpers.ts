import { expect, type Page } from "@playwright/test";
import { latestCode, STAFF } from "./backend";

/**
 * Opens a page as the signed-in staff member. The session comes from staff.setup.ts, which logged in
 * once through the real screens, so tests don't each send a code.
 */
export async function logIn(page: Page, next = "/") {
  await page.goto(next);
  const escaped = next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await expect(page).toHaveURL(new RegExp(`${escaped}$`));
}

/** The password step. */
export async function submitPassword(page: Page, { email = STAFF.email, password = STAFF.password } = {}) {
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
}

/** The code step, with the code the backend emailed. */
export async function enterEmailedCode(page: Page) {
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.getByLabel("Code", { exact: true }).fill(await latestCode());
  await page.getByRole("button", { name: "Log in" }).click();
}

/** A full log in through the screens, from the log in page. */
export async function logInWithForm(page: Page, next = "/") {
  await page.goto(next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
  await submitPassword(page);
  await enterEmailedCode(page);
  const escaped = next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await expect(page).toHaveURL(new RegExp(`${escaped}$`));
}
