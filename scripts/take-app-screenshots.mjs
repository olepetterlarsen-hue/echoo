#!/usr/bin/env node
// Tar screenshots av Echoo-appen for bruk i landing-bilder.
// Kjøres fra echoo-repoet: node scripts/take-app-screenshots.mjs
// Krever: NEXT_PUBLIC_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY i .env.local
// Bruker Playwright + Chromium.

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_FILE = join(ROOT, ".env.local");
const OUT_DIR = "/tmp/echoo-screenshots";

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

function loadEnv() {
  const raw = readFileSync(ENV_FILE, "utf8");
  const map = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = "https://app.echoo.no";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Mangler Supabase-env");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const suffix = Math.random().toString(36).slice(2, 10);
const email = `screenshots-${suffix}@echoo.internal`;
const password = "Screen1234!";
let userId, orgId;

async function seed() {
  console.log(`  → oppretter test-admin ${email}`);
  const { data: user, error: e1 } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Screenshot admin" },
  });
  if (e1) throw new Error(`createUser: ${e1.message}`);
  userId = user.user.id;

  const { data: newOrgId, error: e2 } = await admin.rpc("signup_organization", {
    p_user_id: userId,
    p_firma: `Screenshot Elektro AS ${suffix}`,
    p_org_nr: null,
    p_employee_count: 12,
    p_full_name: "Screenshot admin",
  });
  if (e2) throw new Error(`signup_organization: ${e2.message}`);
  orgId = newOrgId;

  console.log(`  → seeder demo-data (kunde, prosjekt, avvik)`);
  const { error: e3 } = await admin.from("customers").insert({
    organization_id: orgId,
    customer_type: "bedrift",
    name: "Nordlys Eiendom AS",
    org_number: "912345678",
    contact_person: "Kari Nordmann",
    email: "kari@nordlyseiendom.no",
    phone: "+47 90 80 96 08",
    city: "Trondheim",
    created_by: userId,
  });
  if (e3) throw new Error(`customer insert: ${e3.message}`);

  const { data: customer } = await admin.from("customers").select("id").eq("name", "Nordlys Eiendom AS").eq("organization_id", orgId).single();
  const { data: project, error: e4 } = await admin.from("projects").insert({
    organization_id: orgId,
    project_number: "2026-118",
    title: "Elektro Næringsbygg Lade",
    customer_id: customer?.id,
    customer_name: "Nordlys Eiendom AS",
    site_address: "Haakon VIIs gate 9",
    site_city: "Trondheim",
    site_postal_code: "7042",
    status: "aktiv",
    installation_type: "naering",
    created_by: userId,
    assigned_to: userId,
  }).select("id").single();
  if (e4) throw new Error(`project insert: ${e4.message}`);

  const projectId = project.id;
  await admin.from("deviations").insert([
    { organization_id: orgId, project_id: projectId, title: "Manglende jording i tavle B02", severity: "hoey", status: "under_arbeid", reported_by: userId, assigned_to: userId, description: "Under sluttkontroll ble det avdekket at PE-lederen ikke var koblet til jordskinnen." },
    { organization_id: orgId, project_id: projectId, title: "Feil dimensjonering på kurs 3", severity: "middels", status: "aapen", reported_by: userId, assigned_to: userId, description: "Kabel 2,5 mm² brukt der 4 mm² var spesifisert." },
    { organization_id: orgId, project_id: projectId, title: "Bruksanvisning mangler i skap", severity: "lav", status: "aapen", reported_by: userId, description: "Slutt-dokumentasjon ikke oppdatert i eltavle-front." },
  ]);
  return projectId;
}

async function shoot(page, name) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  ✓ ${name}.png`);
}

async function run() {
  let projectId;
  try {
    projectId = await seed();
  } catch (e) {
    console.error("Seed feilet:", e.message);
    process.exit(1);
  }

  const browser = await chromium.launch();
  try {
    // Mobil-viewport for telefon-screenshots
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      locale: "nb-NO",
    });
    const mpage = await mobile.newPage();
    await mpage.goto(`${BASE_URL}/login`);
    await mpage.locator('input[type="email"]').fill(email);
    await mpage.locator('input[type="password"]').fill(password);
    await mpage.locator('button[type="submit"]').click();
    await mpage.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20000 });
    // Hopp over onboarding
    if (mpage.url().includes("/onboarding")) {
      await mpage.goto(`${BASE_URL}/dashboard`);
    }
    await mpage.waitForLoadState("networkidle");
    await shoot(mpage, "mobile-dashboard");

    await mpage.goto(`${BASE_URL}/avvik`);
    await mpage.waitForLoadState("networkidle");
    await shoot(mpage, "mobile-avvik");

    await mpage.goto(`${BASE_URL}/prosjekter/${projectId}`);
    await mpage.waitForLoadState("networkidle");
    await shoot(mpage, "mobile-prosjekt");

    // Nettbrett-viewport for tablet-screenshots
    const tablet = await browser.newContext({
      viewport: { width: 1024, height: 768 },
      deviceScaleFactor: 2,
      locale: "nb-NO",
    });
    const tpage = await tablet.newPage();
    await tpage.goto(`${BASE_URL}/login`);
    await tpage.locator('input[type="email"]').fill(email);
    await tpage.locator('input[type="password"]').fill(password);
    await tpage.locator('button[type="submit"]').click();
    await tpage.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20000 });
    if (tpage.url().includes("/onboarding")) await tpage.goto(`${BASE_URL}/dashboard`);
    await tpage.waitForLoadState("networkidle");
    await shoot(tpage, "tablet-dashboard");

    await tpage.goto(`${BASE_URL}/prosjekter/${projectId}`);
    await tpage.waitForLoadState("networkidle");
    await shoot(tpage, "tablet-prosjekt");
  } finally {
    await browser.close();
    console.log(`  → rydder test-org ${orgId}`);
    await admin.rpc("delete_organization_cascade", { p_org_id: orgId }).catch(() => {});
    await admin.from("organizations").delete().eq("id", orgId).catch(() => {});
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    console.log(`\nScreenshots i ${OUT_DIR}/`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
