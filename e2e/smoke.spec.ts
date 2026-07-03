import { test, expect } from "@playwright/test";

test.describe("uinnlogget", () => {
  // Nullstill sesjon for disse testene.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("beskyttet rute redirecter til /login", async ({ page }) => {
    await page.goto("/prosjekter");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe("innlogget admin", () => {
  test("dashboard laster", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    // AppShell-navigasjon skal være til stede.
    await expect(page.getByRole("link", { name: /prosjekter/i }).first()).toBeVisible();
  });

  test("prosjektlisten laster", async ({ page }) => {
    await page.goto("/prosjekter");
    await expect(page).toHaveURL(/\/prosjekter/);
    // Enten tabell-header eller tom-tilstand — begge beviser at siden rendret.
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});
