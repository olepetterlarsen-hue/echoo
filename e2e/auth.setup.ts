import { test as setup, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { CREDS_PATH, STORAGE_STATE_PATH, type E2ECreds } from "./env";

/**
 * Logger inn via UI som test-admin og lagrer sesjonen (cookies) til
 * storageState, som resten av testene gjenbruker.
 */
setup("authenticate as admin", async ({ page }) => {
  const creds = JSON.parse(readFileSync(CREDS_PATH, "utf8")) as E2ECreds;

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.locator('button[type="submit"]').click();

  // Vellykket innlogging tar oss bort fra /login (til /dashboard).
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
