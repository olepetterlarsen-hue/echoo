#!/usr/bin/env -S npx tsx
// Golden-test for FIXPLAN punkt 10 (A7/I-04, I-28, I-29): sentral
// rollesjekk for hele /admin/*-prefikset. Tester den rene
// beslutningsfunksjonen adminGateDecision() — ikke selve middlewaren
// (krever mocket NextRequest/Supabase-klient, lav verdi sammenlignet med
// å teste selve beslutningslogikken direkte).
// Kjør: npx tsx scripts/qa/admin-rbac.test.ts

import assert from "node:assert/strict";
import { adminGateDecision } from "../../src/lib/supabase/proxy";

const NON_ADMIN_ROLES = ["montor", "elektriker", "prosjektleder", "installator", "bemyndiget", undefined];

function main() {
  // 1) Ikke-/admin-ruter skal alltid slippe gjennom, uansett rolle.
  for (const role of [...NON_ADMIN_ROLES, "admin"]) {
    assert.deepEqual(
      adminGateDecision("/dashboard", role),
      { action: "allow" },
      `/dashboard skal alltid tillates (rolle: ${role})`,
    );
  }
  console.log("OK  ikke-/admin-ruter påvirkes ikke av gaten");

  // 2) Admin skal alltid slippe gjennom alle /admin/*-ruter.
  for (const path of ["/admin", "/admin/brukere", "/admin/import-wizard", "/admin/bulk-import/template", "/admin/abonnement"]) {
    assert.deepEqual(
      adminGateDecision(path, "admin"),
      { action: "allow" },
      `admin skal alltid slippe gjennom ${path}`,
    );
  }
  console.log("OK  admin slipper gjennom alle /admin/*-ruter, inkludert de tidligere ugatede");

  // 3) Ikke-admin skal redirectes bort fra vanlige admin-sider — inkludert
  //    de to konkrete hullene som ikke hadde NOEN sjekk før denne fiksen:
  //    import-wizard og abonnement-siden.
  for (const role of NON_ADMIN_ROLES) {
    for (const path of ["/admin/brukere", "/admin/import-wizard", "/admin/abonnement", "/admin/bulk-import"]) {
      assert.deepEqual(
        adminGateDecision(path, role),
        { action: "redirect", to: "/dashboard" },
        `${role ?? "(ingen rolle)"} skal redirectes bort fra ${path}`,
      );
    }
  }
  console.log("OK  ikke-admin redirectes til /dashboard fra import-wizard, abonnement og andre admin-sider");

  // 4) Det tredje hullet — GET /admin/bulk-import/template — skal gi 403,
  //    IKKE redirect (maskinklient/nedlastingsknapp, ikke en side).
  for (const role of NON_ADMIN_ROLES) {
    assert.deepEqual(
      adminGateDecision("/admin/bulk-import/template", role),
      { action: "forbidden" },
      `${role ?? "(ingen rolle)"} skal få 403 på malnedlastingen, ikke en redirect`,
    );
  }
  console.log("OK  /admin/bulk-import/template gir forbidden (403), ikke redirect, for ikke-admin");

  console.log("Alle golden-tester for admin-RBAC bestått.");
}

main();
