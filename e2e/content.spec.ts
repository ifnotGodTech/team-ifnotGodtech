import { expect, test, type Page } from "@playwright/test";
import { logIn } from "./helpers";

// Each test has its own browser, so content saved through the stand-in never leaks between tests.

const planCard = (page: Page, name: string) => page.getByRole("form", { name });

test("saves a new price, saying when it applies, and moves 'recommended'", async ({ page }) => {
  await logIn(page, "/content");
  const growth = planCard(page, "Growth");

  await growth.getByLabel("Monthly price (₦)").fill("45,000");
  await growth.getByRole("button", { name: "Save Growth" }).click();
  await expect(growth.getByRole("status")).toHaveText(
    "Saved. It appears on the website within a few minutes. New subscribers pay ₦45,000 straight away, and existing subscribers from their next renewal."
  );

  const pro = planCard(page, "Pro");
  await pro.getByLabel("Show as recommended").check();
  await pro.getByRole("button", { name: "Save Pro" }).click();
  await expect(pro.getByRole("status")).toHaveText("Saved. It appears on the website within a few minutes.");
  await page.reload();
  await expect(planCard(page, "Growth").getByLabel("Show as recommended")).not.toBeChecked();
  await expect(planCard(page, "Growth").getByLabel("Monthly price (₦)")).toHaveValue("45,000");
});

test("adds, reorders and removes a plan's other lines", async ({ page }) => {
  await logIn(page, "/content");
  const starter = planCard(page, "Starter");

  await starter.getByLabel("Add a line").fill("Monthly strategy call");
  await starter.getByRole("button", { name: "Add", exact: true }).click();
  await starter.getByRole("button", { name: "Move Monthly strategy call up" }).click();
  await starter.getByRole("button", { name: "Remove Email support" }).click();
  await starter.getByRole("button", { name: "Save Starter" }).click();
  await expect(starter.getByRole("status")).toContainText("Saved.");

  await page.reload();
  await expect(planCard(page, "Starter").getByRole("listitem")).toHaveText([/^Landing or link-in-bio page/, /^Monthly strategy call/]);
});

test("explains a price that isn't valid, keeping what was typed", async ({ page }) => {
  await logIn(page, "/content");
  const pro = planCard(page, "Pro");

  await pro.getByLabel("Changes a month").fill("3");
  await pro.getByLabel("Monthly price (₦)").fill("80k");
  await pro.getByRole("button", { name: "Save Pro" }).click();

  await expect(pro.getByText("Enter the price in whole naira, such as 40,000.")).toBeVisible();
  await expect(pro.getByLabel("Changes a month")).toHaveValue("3");
});

test("adds a service", async ({ page }) => {
  await logIn(page, "/content?tab=services");

  await page.getByRole("link", { name: "Add a service" }).click();
  const form = page.getByRole("form", { name: "Add a service" });
  await form.getByLabel("Name").fill("Monthly sales report");
  await form.getByLabel("The problem it solves, in the client's words").fill("I never know how sales went.");
  await form.getByLabel("Starter", { exact: true }).uncheck();
  await form.getByRole("button", { name: "Save service" }).click();

  await expect(page.getByRole("status")).toHaveText("Service added. It appears on the website within a few minutes.");
  await expect(page.getByRole("region", { name: "Everyday automations" }).getByText("Monthly sales report")).toBeVisible();
  // Clients choosing a new service comes back with phase 8, when site content is saved to the backend.
});

test("warns about a gap between plans and about clients who have a service, but still saves", async ({ page }) => {
  await logIn(page, "/content?tab=services&edit=lead-follow-up");
  const form = page.getByRole("form", { name: "Edit Lead follow-up" });

  await form.getByLabel("Pro", { exact: true }).uncheck();
  await expect(form.getByText("Growth includes this service, but Pro doesn't. A client moving up to Pro would lose it. You can still save.")).toBeVisible();
  await expect(form.getByText(/Clients on Pro who already have it keep it until we let them know and move them on/)).toBeVisible();

  await form.getByRole("button", { name: "Save service" }).click();
  await expect(page.getByRole("status")).toHaveText("Service saved. It appears on the website within a few minutes.");
  await expect(page.getByText(/In Starter and Growth · We forget to call people back/)).toBeVisible();
});

test("refuses a service name that's already used, keeping what was typed", async ({ page }) => {
  await logIn(page, "/content?tab=services&edit=new");
  const form = page.getByRole("form", { name: "Add a service" });

  await form.getByLabel("Name").fill("Lead follow-up");
  await form.getByLabel("The problem it solves, in the client's words").fill("Something new and different.");
  await form.getByRole("button", { name: "Save service" }).click();

  await expect(form.getByText("There's already a service called Lead follow-up.")).toBeVisible();
  await expect(form.getByLabel("The problem it solves, in the client's words")).toHaveValue("Something new and different.");
});

test("hides a service only after confirming, then shows it again", async ({ page }) => {
  await logIn(page, "/content?tab=services");
  const agents = page.getByRole("region", { name: "AI agents" });
  const callAgent = agents.getByRole("listitem").filter({ hasText: "AI call agent" });

  await callAgent.getByRole("button", { name: "Hide from the website" }).click();
  await expect(callAgent.getByRole("alertdialog")).toContainText("It keeps running for clients who already have it");
  await callAgent.getByRole("button", { name: "Hide it" }).click();

  await expect(page.getByRole("status")).toHaveText("Service hidden from the website. It keeps running for clients who already have it.");
  await expect(callAgent.getByText("Hidden")).toBeVisible();
  await callAgent.getByRole("button", { name: "Show on the website" }).click();
  await expect(callAgent.getByText("Shown on the site")).toBeVisible();
});

test("adds a service group, which every plan can then include", async ({ page }) => {
  await logIn(page, "/content?tab=groups");

  await page.getByRole("link", { name: "Add a group" }).click();
  const form = page.getByRole("form", { name: "Add a group" });
  await form.getByLabel("Name").fill("Websites and apps");
  await form.getByLabel("One of them is called").fill("website or app");
  await form.getByLabel("Several are called").fill("websites or apps");
  await form.getByRole("button", { name: "Save group" }).click();

  await expect(page.getByRole("status")).toHaveText("Group added. It appears on the website within a few minutes.");
  await expect(page.getByRole("form", { name: "Websites and apps" })).toBeVisible();
  await page.goto("/content");
  await expect(planCard(page, "Growth").getByLabel("Websites and apps")).toHaveValue("0");
});

test("saves the site text, explaining text that's too short", async ({ page }) => {
  await logIn(page, "/content?tab=text");
  const form = page.getByRole("form", { name: "Site text" });

  await form.getByLabel("Home page headline").fill("Hi");
  await form.getByRole("button", { name: "Save site text" }).click();
  await expect(form.getByText("Enter a headline.")).toBeVisible();

  await form.getByLabel("Home page headline").fill("Every problem has a tech solution.");
  await form.getByRole("button", { name: "Save site text" }).click();
  await expect(form.getByRole("status")).toHaveText("Saved. It appears on the website within a few minutes.");
  await page.reload();
  await expect(page.getByLabel("Home page headline")).toHaveValue("Every problem has a tech solution.");
});

for (const [label, width] of [
  ["phone", 375],
  ["tablet", 768],
  ["desktop", 1280],
] as const) {
  test(`site content fits at ${label} width`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await logIn(page, "/content");

    for (const path of ["/content", "/content?tab=services", "/content?tab=services&edit=new", "/content?tab=groups&edit=new", "/content?tab=text"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: "Site content" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBe(true);
    }
  });
}

// Site content needs JavaScript: adding and reordering plan lines are done in the browser, and
// the page is large enough that it streams in after the loading screen.
