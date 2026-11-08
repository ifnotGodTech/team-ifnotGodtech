import { expect, type Page } from "@playwright/test";

// The stand-in backend: any @ifnotgod.com email works, and the code is always 123456.
export const STAND_IN_CODE = "123456";

export async function logIn(page: Page, next = "/") {
  await page.goto(next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Work email").fill("tunde@ifnotgod.com");
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.getByLabel("Code", { exact: true }).fill(STAND_IN_CODE);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(new RegExp(`${next === "/" ? "/" : next}$`));
}
