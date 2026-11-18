import { expect, test } from "@playwright/test";
import { clientPath } from "./backend";
import { logIn } from "./helpers";

test.beforeEach(async ({ page }) => logIn(page, "/clients"));

test("lists clients a page at a time", async ({ page }) => {
  await expect(page.getByRole("status")).toHaveText("13 clients");
  await expect(page.getByRole("region", { name: "Client list" }).getByRole("row")).toHaveCount(11);

  await page.getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL(/\/clients\?page=2$/);
  await expect(page.getByRole("region", { name: "Client list" }).getByRole("row")).toHaveCount(4);
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
});

test("searches by name, business or email, and clears the search", async ({ page }) => {
  await page.getByLabel("Search by name, business or email").fill("pharmacy");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/\/clients\?q=pharmacy$/);
  await expect(page.getByRole("status")).toHaveText("1 client matches “pharmacy”");
  await expect(page.getByRole("link", { name: "Chinedu Eze" })).toBeVisible();

  await page.getByRole("link", { name: "Clear search" }).click();
  await expect(page.getByRole("status")).toHaveText("13 clients");
});

test("explains a search with no matches", async ({ page }) => {
  await page.goto("/clients?q=nobody");

  await expect(page.getByRole("heading", { name: "No clients match your search" })).toBeVisible();
});

test("opens a client's details", async ({ page }) => {
  await page.getByRole("link", { name: "Ada Obi" }).click();

  await expect(page).toHaveURL(new RegExp(`${clientPath("ada")}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Ada Obi" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Clients", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Subscribed to Growth, monthly")).toBeVisible();
});

test("sends a password reset email only after confirming", async ({ page }) => {
  await page.goto(clientPath("ada"));

  await page.getByRole("button", { name: "Send a password reset email" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("We'll email ada@obilogistics.com a link to set a new password.");
  await page.getByRole("button", { name: "Go back" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Send a password reset email" }).click();
  await page.getByRole("button", { name: "Send the email" }).click();

  await expect(page).toHaveURL(new RegExp(`${clientPath("ada")}\\?reset=sent$`));
  await expect(page.getByText("Password reset email sent.")).toBeVisible();
});

test("an unknown client shows not found", async ({ page }) => {
  // The status stays 200: loading.tsx starts streaming before the page can call notFound().
  // Every page is noindex, so only what staff see matters here.
  await page.goto("/clients/nope");

  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

for (const [label, width] of [
  ["phone", 375],
  ["tablet", 768],
  ["desktop", 1280],
] as const) {
  test(`client pages fit at ${label} width`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });

    for (const path of ["/clients", clientPath("ada")]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBe(true);
    }
  });
}

// Searching needs JavaScript: signed-in pages stream in behind the loading screen once the backend
// answers, and without JavaScript the loading screen is never replaced.
