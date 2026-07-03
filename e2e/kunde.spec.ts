import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { CREDS_PATH, type E2ECreds } from "./env";

/**
 * Kritisk flyt: admin oppretter en ny kunde og ser den i lista.
 * Beviser auth + server action (createCustomer) + RLS-scopet lesing.
 */
test("opprett kunde og se den i lista", async ({ page }) => {
  const creds = JSON.parse(readFileSync(CREDS_PATH, "utf8")) as E2ECreds;
  const kundeNavn = `E2E Kunde ${creds.suffix}`;

  await page.goto("/kunder/ny");
  // Kundetype defaulter til "bedrift" → Firmanavn-feltet er synlig og påkrevd.
  await page.getByLabel("Firmanavn").fill(kundeNavn);
  await page.getByRole("button", { name: "Opprett kunde" }).click();

  // Server action redirecter til /kunder/<id> eller /kunder.
  await page.waitForURL(/\/kunder(\/|$)/, { timeout: 20_000 });
  await expect(page.getByText(kundeNavn).first()).toBeVisible();

  // Kunden skal også dukke opp i oversikten.
  await page.goto("/kunder");
  await expect(page.getByText(kundeNavn).first()).toBeVisible();
});
