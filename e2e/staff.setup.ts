import { test as setup } from "@playwright/test";
import { STAFF_STATE } from "./backend";
import { logInWithForm } from "./helpers";

setup("log in through the real backend", async ({ page }) => {
  await logInWithForm(page);
  await page.context().storageState({ path: STAFF_STATE });
});
