import { expect, test } from "@playwright/test";

const PAGES = [
  ["/", "Overview"],
  ["/clients", "Clients"],
  ["/subscriptions", "Subscriptions"],
  ["/content", "Site content"],
] as const;

test("every page is kept out of search engines and caches, and can't be framed", async ({ request }) => {
  for (const [path] of PAGES) {
    const headers = (await request.get(path)).headers();
    expect(headers["x-robots-tag"], path).toBe("noindex, nofollow");
    expect(headers["cache-control"], path).toContain("no-store");
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
  }
});

test("robots.txt disallows everything", async ({ request }) => {
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
});

test("the sidebar reaches every area and marks where you are", async ({ page }) => {
  await page.goto("/");

  for (const [path, name] of PAGES) {
    await page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name }).click();
    await expect(page).toHaveURL(new RegExp(`${path === "/" ? "/" : path}$`));
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
  }
});

test("pages load without errors or blocked resources", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });

  for (const [path] of PAGES) await page.goto(path, { waitUntil: "networkidle" });

  expect(problems).toEqual([]);
});

test("focus is visible on the dark sidebar", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  await expect(page.getByRole("link", { name: "Overview" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Overview" })).toHaveCSS("outline-color", "rgb(224, 123, 42)");
});

for (const [label, width] of [
  ["phone", 375],
  ["tablet", 768],
  ["desktop", 1280],
] as const) {
  test(`the layout fits at ${label} width`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/clients");

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const sidebar = await page.locator("aside").boundingBox();
    const main = await page.locator("main").boundingBox();
    if (width < 800) {
      expect(main!.y).toBeGreaterThanOrEqual(sidebar!.y + sidebar!.height - 1);
      expect(sidebar!.height, "a stacked sidebar stays compact").toBeLessThan(360);
    }
    else {
      expect(main!.x).toBeGreaterThanOrEqual(sidebar!.x + sidebar!.width - 1);
      expect(sidebar!.height, "the sidebar runs the full height beside the content").toBeGreaterThanOrEqual(800);
    }
  });
}
