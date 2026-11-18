import { expect, test } from "@playwright/test";
import { clientPath } from "./backend";
import { logIn } from "./helpers";

test("each count opens the list behind it", async ({ page }) => {
  await logIn(page, "/");
  const glance = page.getByRole("region", { name: "At a glance" });

  await glance.getByRole("link", { name: /Renewing in 7 days/ }).click();
  await expect(page).toHaveURL(/\/subscriptions\?show=renewing$/);
  await expect(page.getByRole("link", { name: /Renewing in 7 days/ })).toHaveAttribute("aria-current", "page");

  await page.goto("/");
  await glance.getByRole("link", { name: /Clients without a plan\s*3/ }).click();
  await expect(page).toHaveURL(/\/clients\?plan=none$/);
  await expect(page.getByRole("status")).toHaveText("3 clients without a plan");

  await page.getByLabel("Search by name, business or email").fill("musa");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/clients\?plan=none&q=musa$/);
  await expect(page.getByRole("status")).toHaveText("1 client without a plan matches “musa”");
});

test("shows upcoming renewals and recent changes, including a change just made", async ({ page }) => {
  await logIn(page, "/");
  const renewals = page.getByRole("region", { name: "Upcoming renewals" });
  await expect(renewals.getByRole("row")).toHaveCount(5);
  await expect(renewals.getByRole("row", { name: /Ada Obi/ })).toContainText("Sent");


  await page.goto(clientPath("ada"));
  await page.getByRole("button", { name: "Cancel subscription" }).click();
  await page.getByRole("button", { name: "Yes, cancel the subscription" }).click();
  await expect(page.getByRole("status")).toContainText("Subscription cancelled.");

  await page.getByRole("link", { name: "Overview" }).click();
  await expect(renewals.getByRole("row", { name: /Ada Obi/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Recent changes" }).getByRole("listitem").first()).toContainText(
    "Ada Obi: Cancelled. Keeps working until"
  );
  await expect(page.getByRole("link", { name: /Cancelled, still running\s*3/ })).toBeVisible();

  // Put Ada's plan back for the tests that follow.
  await page.goto(clientPath("ada"));
  await page.getByRole("button", { name: "Keep the plan" }).click();
  await expect(page.getByRole("status")).toHaveText("Plan kept. It renews automatically again.");
});

for (const [label, width] of [
  ["phone", 375],
  ["tablet", 768],
  ["desktop", 1280],
] as const) {
  test(`the overview fits at ${label} width`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await logIn(page, "/");

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
