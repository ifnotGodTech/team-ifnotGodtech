import { expect, test } from "@playwright/test";
import { logIn } from "./helpers";

// Each test has its own browser, so changes made through the stand-in never leak between tests.

const list = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Subscription list" });

test("filters subscriptions, each filter with its own address", async ({ page }) => {
  await logIn(page, "/subscriptions");
  await expect(list(page).getByRole("row")).toHaveCount(11);

  await page.getByRole("link", { name: "Renewing in 7 days (4)" }).click();
  await expect(page).toHaveURL(/\/subscriptions\?show=renewing$/);
  await expect(list(page).getByRole("row")).toHaveCount(5);

  await page.getByRole("link", { name: "Cancelled, still running (2)" }).click();
  await expect(list(page).getByRole("row", { name: /Funmi Adeyemi/ })).toContainText("Ends");

  await page.getByRole("link", { name: "Active (8)" }).click();
  await expect(list(page).getByRole("row", { name: /Funmi Adeyemi/ })).toHaveCount(0);
});

test("cancels a plan after confirming, then keeps it", async ({ page }) => {
  await logIn(page, "/clients/c-ada");

  await page.getByRole("button", { name: "Cancel subscription" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Cancel Ada Obi's Growth plan?" });
  await expect(dialog).toContainText("No refund is due.");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel subscription" })).toBeFocused();

  await page.getByRole("button", { name: "Cancel subscription" }).click();
  await page.getByRole("button", { name: "Yes, cancel the subscription" }).click();

  await expect(page).toHaveURL(/\?done=cancelled$/);
  await expect(page.getByRole("status")).toHaveText("Subscription cancelled. The client is emailed to confirm.");
  await expect(page.getByText(/Everything keeps working until \d+ November 2026, then the automations stop/)).toBeVisible();
  await expect(page.getByRole("region", { name: "History" }).getByRole("listitem").first()).toContainText("Cancelled the subscription");
  await expect(page.getByRole("region", { name: "History" }).getByRole("listitem").first()).toContainText("by tunde@ifnotgod.com");
  await expect(page.getByRole("button", { name: "Cancel subscription" })).toHaveCount(0);

  await page.getByRole("button", { name: "Keep the plan" }).click();
  await expect(page.getByRole("status")).toHaveText("Plan kept. It renews automatically again.");
  await expect(page.getByText("Renews automatically", { exact: true })).toBeVisible();

  await page.goto("/subscriptions?show=cancelled");
  await expect(list(page).getByRole("row", { name: /Ada Obi/ })).toHaveCount(0);
});

test("swaps a service using one of the month's changes", async ({ page }) => {
  await logIn(page, "/clients/c-chinedu");
  await expect(page.getByText("1 of 1")).toBeVisible();

  await page.getByRole("link", { name: "Change services" }).click();
  await page.getByLabel("Payment reminders and receipts").uncheck();
  await page.getByLabel("Lead follow-up").check();
  await expect(page.getByText("This uses 1 of the client's 1 change left this month.")).toBeVisible();
  await page.getByRole("button", { name: "Save services" }).click();

  await expect(page).toHaveURL(/\/clients\/c-chinedu\?done=services$/);
  await expect(page.getByRole("status")).toHaveText("Services saved. The client is emailed to confirm.");
  await expect(page.getByText("0 of 1")).toBeVisible();
  await expect(page.getByText("Swapped Payment reminders and receipts for Lead follow-up")).toBeVisible();
});

test("explains a swap with no changes left, keeping what was ticked", async ({ page }) => {
  await logIn(page, "/clients/c-ada/services");

  await page.getByLabel("Daily business brief").uncheck();
  await page.getByLabel("Payment reminders and receipts").check();
  await page.getByRole("button", { name: "Save services" }).click();

  await expect(page.locator("main form").getByRole("alert")).toHaveText("That would use 1 change, but the client has none left this month.");
  await expect(page.getByLabel("Payment reminders and receipts")).toBeChecked();
  await expect(page.getByLabel("Daily business brief")).not.toBeChecked();
});

test("changes plan from the next renewal, and drops the change again", async ({ page }) => {
  await logIn(page, "/clients/c-ada/plan");

  await page.getByRole("radio", { name: /Pro/ }).check();
  await expect(page.getByText(/Pro starts at the next renewal, on \d+ November 2026. Nothing is charged today/)).toBeVisible();
  await page.getByRole("button", { name: "Save plan change" }).click();

  await expect(page.getByRole("status")).toHaveText("Plan change saved. The client is emailed to confirm.");
  await expect(page.getByText(/Moves to Pro on \d+ November 2026. Nothing to pay until then./)).toBeVisible();

  await page.getByRole("link", { name: "Change plan" }).click();
  await expect(page.getByRole("radio", { name: /Pro/ })).toBeChecked();
  await page.getByRole("radio", { name: /Growth/ }).check();
  await page.getByRole("button", { name: "Save plan change" }).click();
  await expect(page.getByText("Plan change", { exact: true })).toHaveCount(0);
});

test("a cancelled plan offers no changes, and a client without a plan says so", async ({ page }) => {
  await logIn(page, "/clients/c-funmi/services");
  await expect(page.getByText("This plan is cancelled, so it can't be changed.")).toBeVisible();

  await page.goto("/clients/c-musa");
  await expect(page.getByRole("heading", { name: "No plan" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Payments" })).toHaveCount(0);
});

for (const [label, width] of [
  ["phone", 375],
  ["tablet", 768],
  ["desktop", 1280],
] as const) {
  test(`subscription pages fit at ${label} width`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await logIn(page, "/subscriptions");

    for (const path of ["/subscriptions", "/clients/c-ada", "/clients/c-funmi", "/clients/c-ada/services", "/clients/c-ada/plan"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBe(true);
    }
  });
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("filters, keeping a plan and changing services still work", async ({ page }) => {
    await logIn(page, "/subscriptions");
    await page.getByRole("link", { name: "Cancelled, still running (2)" }).click();
    await expect(list(page).getByRole("row")).toHaveCount(3);

    await page.goto("/clients/c-funmi");
    await page.getByRole("button", { name: "Keep the plan" }).click();
    await expect(page.getByRole("status")).toHaveText("Plan kept. It renews automatically again.");

    await page.goto("/clients/c-chinedu/services");
    await page.getByLabel("Payment reminders and receipts").uncheck();
    await page.getByLabel("Lead follow-up").check();
    await page.getByRole("button", { name: "Save services" }).click();
    await expect(page.getByRole("status")).toHaveText("Services saved. The client is emailed to confirm.");
  });
});
