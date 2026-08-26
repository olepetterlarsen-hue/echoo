#!/usr/bin/env -S npx tsx
// Golden-test for FIXPLAN punkt 6 (B5/F-14): en admin som selv er
// installatør/bemyndiget (enmannsforetak) skal kunne signere
// samsvarserklæringer uten at admin-rollen generelt får signeringsrett.
// Kjør: npx tsx scripts/qa/samsvar-signing-role.test.ts

import assert from "node:assert/strict";
import { canSignSamsvar, SAMSVAR_SIGNING_ROLES } from "../../src/lib/types/database";
import type { UserRole } from "../../src/lib/types/database";

function main() {
  // 1) De to rollene som alltid har signeringsrett, uansett flagg.
  for (const role of SAMSVAR_SIGNING_ROLES) {
    assert.equal(canSignSamsvar(role, false), true, `${role} skal alltid kunne signere`);
  }

  // 2) Vanlig admin UTEN flagget: fortsatt sperret — dette er selve fiksen
  //    fra 2026-06-26 (admin skal ikke automatisk kunne signere), som IKKE
  //    skal reverseres av denne løsningen.
  assert.equal(
    canSignSamsvar("admin", false),
    false,
    "admin uten qualified_signer skal IKKE kunne signere — ville reversert 2026-06-26-fiksen",
  );

  // 3) Admin i et enmannsforetak MED flagget: nå tillatt (B5 — dette er
  //    selve funksjonen som løser at en enmannsbedrift kommer i mål).
  assert.equal(
    canSignSamsvar("admin", true),
    true,
    "admin MED qualified_signer skal kunne signere (enmannsforetak-scenarioet)",
  );

  // 4) En montør uten flagget skal fortsatt være sperret (A5/plan-krav:
  //    "En montør uten flagget får fortsatt disabled knapp").
  const otherRoles: UserRole[] = ["prosjektleder", "elektriker", "montor"];
  for (const role of otherRoles) {
    assert.equal(
      canSignSamsvar(role, false),
      false,
      `${role} uten flagget skal ikke kunne signere`,
    );
    assert.equal(
      canSignSamsvar(role, true),
      true,
      `${role} MED flagget skal kunne signere — flagget er rolleuavhengig per design`,
    );
  }

  console.log("OK  canSignSamsvar() håndhever både rolle- og flagg-basert signeringsrett korrekt");
  console.log("Alle golden-tester for samsvar-signeringsrolle bestått.");
}

main();
