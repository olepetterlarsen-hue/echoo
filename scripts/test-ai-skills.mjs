#!/usr/bin/env node
// Tester eksisterende AI-skills mot prod app.echoo.no via Playwright.
// Åpner AssistantButton, kjører hver skill med en typisk case, rapporterer.
// Krever service_role + prod-URL i .env.local.

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = "/tmp/ai-skills-test";
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.local"), "utf8")
    .split("\n")
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = "https://app.echoo.no";
const admin = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

const suffix = Math.random().toString(36).slice(2, 10);
const email = `aitest-${suffix}@echoo.internal`;
const password = "AiTest1234!";
let userId, orgId;

async function seed() {
  console.log(`  → oppretter test-admin ${email}`);
  const { data: user, error: e1 } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: "AI-test admin" },
  });
  if (e1) throw new Error(`createUser: ${e1.message}`);
  userId = user.user.id;
  const { data: newOrgId, error: e2 } = await admin.rpc("signup_organization", {
    p_user_id: userId,
    p_firma: `AI-test AS ${suffix}`,
    p_org_nr: null,
    p_employee_count: 5,
    p_full_name: "AI-test admin",
  });
  if (e2) throw new Error(`signup_organization: ${e2.message}`);
  orgId = newOrgId;
}

async function cleanup() {
  console.log(`  → rydder test-org ${orgId}`);
  try { await admin.from("organizations").delete().eq("id", orgId); } catch {}
  try { await admin.auth.admin.deleteUser(userId); } catch {}
}

async function run() {
  const results = [];
  try {
    await seed();
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ locale: "nb-NO", viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    await page.goto(`${BASE_URL}/login`);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30000 });
    if (page.url().includes("/onboarding")) await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState("networkidle");

    // Åpne AssistantButton
    console.log("  → åpner AssistantButton");
    await page.locator('button:has-text("Assistent"), button[aria-label*="ssistent"], button:has(svg.lucide-sparkles)').first().click({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Test onboarding (default skill)
    const cases = [
      {
        skill: "avvik", label: "Avvik",
        input: "Ved siste sluttkontroll oppdaget vi at PE-lederen ikke var koblet til jordskinnen i tavle B02. Kunden er allerede innflyttet, arbeidet må rettes umiddelbart.",
      },
      {
        skill: "sja", label: "SJA",
        input: "Skal skifte hovedsikring 400A på næringsbygg som er i drift. Kan ikke ta ned strømmen mellom 07 og 22. To montører.",
      },
      {
        skill: "iso", label: "ISO",
        input: "Hva må vi ha på plass for å bli ISO 9001-sertifisert som elektrobedrift med 15 ansatte?",
      },
      {
        skill: "onboarding", label: "Onboarding",
        input: "Hei, jeg er ny her. Hvor skal jeg starte?",
      },
    ];

    for (const c of cases) {
      console.log(`  → ${c.label}-skill`);
      // Klikk på skill-tab (venter til den er synlig først)
      const tab = page.locator(`button:has-text("${c.label}")`).first();
      await tab.waitFor({ state: "visible", timeout: 10000 });
      await tab.click();
      await page.waitForTimeout(800);

      // Fyll input og send
      const textarea = page.locator('textarea').last();
      await textarea.waitFor({ state: "visible", timeout: 5000 });
      await textarea.fill(c.input);
      const send = page.locator('button:has-text("Send"), button:has-text("Lag utkast"), button:has-text("Lag SJA-utkast")').last();
      await send.waitFor({ state: "visible", timeout: 5000 });

      // Snapshot av UI-innholdet FØR klikk (baseline)
      const beforeText = (await page.locator('aside[role="dialog"]').innerText()).length;
      const started = Date.now();
      await send.click();

      // Vent på at UI-innhold FAKTISK vokser (AI-svar tilføyd) — minst 500 tegn mer
      try {
        await page.waitForFunction(
          (baseline) => {
            const el = document.querySelector('aside[role="dialog"]');
            if (!el) return false;
            return el.innerText.length > baseline + 200;
          },
          beforeText,
          { timeout: 60000 },
        );
        const ms = Date.now() - started;
        await page.screenshot({ path: join(OUT_DIR, `${c.skill}.png`), fullPage: false });
        results.push({ skill: c.skill, ok: true, ms });
        console.log(`  ✓ ${c.label} responded (${ms}ms)`);
      } catch (e) {
        await page.screenshot({ path: join(OUT_DIR, `${c.skill}-FAIL.png`), fullPage: false });
        // Se om det er feilmelding synlig
        const errText = await page.locator('aside[role="dialog"]').innerText().catch(() => "");
        const errFound = errText.match(/(mangler|feil|error)/i)?.[0] ?? "timeout";
        results.push({ skill: c.skill, ok: false, error: `${errFound}: ${e.message.slice(0, 100)}` });
        console.log(`  ✗ ${c.label} FAIL (${errFound})`);
      }
    }

    await browser.close();
  } finally {
    await cleanup();
  }

  console.log("\n=== Resultat ===");
  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.skill}: ${r.ok ? `${r.ms}ms` : r.error}`);
  }
  writeFileSync(join(OUT_DIR, "results.json"), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  cleanup().finally(() => process.exit(1));
});
