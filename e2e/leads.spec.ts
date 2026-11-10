import { expect, test } from "@playwright/test";
import { leadPath } from "./backend";
import { logIn } from "./helpers";

// The test backend seeds the Leads mock's six example requests: 3 new, 2 contacted, 1 closed.

const list = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Lead list" });

test("lists audit requests with a count for each status, and the sidebar shows how many are new", async ({ page }) => {
  await logIn(page, "/leads");

  await expect(page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Leads 3 new" })).toHaveAttribute("aria-current", "page");
  await expect(list(page).getByRole("row")).toHaveCount(7);
  await expect(list(page).getByRole("row").nth(1)).toContainText("Kemi Adebayo");

  await page.getByRole("link", { name: "Contacted (2)" }).click();
  await expect(page).toHaveURL(/\/leads\?show=contacted$/);
  await expect(list(page).getByRole("row")).toHaveCount(3);
  await expect(list(page).getByRole("row", { name: /Dayo Akin/ })).toContainText("Contacted");
});

test("opens a request, marks it contacted, closes it, and opens it again", async ({ page }) => {
  await logIn(page, leadPath("ruth"));
  await expect(page.getByRole("heading", { level: 1, name: "Ruth Okeke" })).toBeVisible();
  await expect(page.getByText("I post by hand and don't know what works.")).toBeVisible();
  await expect(page.getByText("ruth@example.com")).toBeVisible();

  await page.getByRole("button", { name: "Mark as contacted" }).click();
  await expect(page.getByRole("status")).toHaveText("Marked as contacted.");
  await expect(page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Leads 2 new" })).toBeVisible();

  await page.getByRole("button", { name: "Mark as closed" }).click();
  await expect(page.getByRole("status")).toHaveText("Marked as closed.");
  await page.getByRole("button", { name: "Mark as new again" }).click();
  await expect(page.getByRole("status")).toHaveText("Marked as new again.");
  await expect(page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Leads 3 new" })).toBeVisible();
});

test("an unknown lead shows not found", async ({ page }) => {
  await logIn(page, "/leads");
  await page.goto("/leads/999999");

  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

for (const [label, width] of [
  ["phone", 375],
  ["tablet", 768],
  ["desktop", 1280],
] as const) {
  test(`leads fit at ${label} width`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await logIn(page, "/leads");

    for (const path of ["/leads", leadPath("kemi")]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBe(true);
    }
  });
}
