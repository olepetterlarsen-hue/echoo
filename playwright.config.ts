import { defineConfig, devices } from "@playwright/test";

/**
 * E2E-oppsett for Echoo.
 *
 * Flyt:
 *  1. global-setup lager en fersk test-organisasjon + admin (med signatur)
 *     via service_role mot Supabase, og skriver credentials til
 *     e2e/.auth/creds.json.
 *  2. "setup"-prosjektet logger inn via UI og lagrer sesjonen til
 *     e2e/.auth/admin.json (storageState) som resten av testene gjenbruker.
 *  3. Testene kjører mot en lokalt startet produksjonsbuild.
 *  4. global-teardown sletter test-orgen og brukerne igjen.
 *
 * Merk: testene treffer samme Supabase som isolasjonstesten. All test-data
 * er entydig merket (e2e-*-<suffix>) og ryddes bort i teardown.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    locale: "nb-NO",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
