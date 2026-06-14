#!/usr/bin/env node
// One-off: opprett demo-bruker + org via Supabase admin API.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SVC) { console.error("Mangler env"); process.exit(2); }

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

const EMAIL = "ole@opcom.no";
const PASSWORD = "Demo1234!";
const FIRMA = "Echoo demo (OPCOM)";
const FULL_NAME = "Ole Petter Larsen";

const { data: created, error: e1 } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { full_name: FULL_NAME },
});
if (e1) {
  if (/already.*registered|already exists|duplicate/i.test(e1.message)) {
    console.error("E-posten er allerede registrert.");
    console.error("Hvis du har en eksisterende konto: bruk reset-link på /login.");
    console.error("Hvis du vil ha en frisk demo: si fra om vi skal slette og opprette på nytt.");
    process.exit(3);
  }
  throw new Error("createUser: " + e1.message);
}
const userId = created.user.id;
console.log("✓ User opprettet:", userId);

const { data: orgId, error: e2 } = await admin.rpc("signup_organization", {
  p_user_id: userId,
  p_firma: FIRMA,
  p_full_name: FULL_NAME,
});
if (e2) {
  await admin.auth.admin.deleteUser(userId).catch(() => {});
  throw new Error("signup_organization: " + e2.message);
}
console.log("✓ Org opprettet:", orgId);

const { data: profile } = await admin
  .from("profiles")
  .select("role, organization_id, full_name")
  .eq("id", userId)
  .single();

const { data: org } = await admin
  .from("organizations")
  .select("firma, plan_tier, subscription_status, trial_ends_at, has_iso_addon")
  .eq("id", orgId)
  .single();

console.log("\n=== Demo-konto klar ===");
console.log("E-post:    ", EMAIL);
console.log("Passord:   ", PASSWORD);
console.log("Bedrift:   ", org?.firma);
console.log("Rolle:     ", profile?.role);
console.log("Plan:      ", org?.plan_tier);
console.log("Status:    ", org?.subscription_status);
console.log("Trial til: ", org?.trial_ends_at);
console.log("ISO-modul: ", org?.has_iso_addon ? "ja" : "nei (men trial gir tilgang)");
console.log("\nLogg inn: https://app.echoo.no/login");
