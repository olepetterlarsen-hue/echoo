#!/usr/bin/env -S npx tsx
// Golden-test for FIXPLAN punkt 8 (A5/I-39): obligatoriske felt må
// håndheves før signering. Faktisk observert symptom: oppstartssjekklisten
// lot seg signere med "Bilens registreringsnummer" (required) tomt.
// Kjør: npx tsx scripts/qa/required-fields.test.ts

import assert from "node:assert/strict";
import { findMissingRequiredFields } from "../../src/lib/document-templates/validation";
import { templateFor } from "../../src/lib/document-templates";

function main() {
  const template = templateFor("startup_checklist");

  // 1) Tomt skjema: "Bilens registreringsnummer" (required:true) skal være
  //    blant de manglende feltene — dette var akkurat symptomet i I-39.
  const missingEmpty = findMissingRequiredFields(template, {});
  const carRegField = missingEmpty.find((f) => f.key === "car_registration");
  assert.ok(
    carRegField,
    `"car_registration" (Bilens registreringsnummer) ble ikke fanget opp som manglende obligatorisk felt. Fant: ${missingEmpty.map((f) => f.key).join(", ")}`,
  );
  assert.equal(carRegField!.label, "Bilens registreringsnummer");
  console.log('OK  tomt "Bilens registreringsnummer" fanges opp som manglende obligatorisk felt');

  // 2) Fylt ut: skal IKKE lenger dukke opp som manglende.
  const missingFilled = findMissingRequiredFields(template, {
    car_registration: "EL12345",
  });
  assert.ok(
    !missingFilled.some((f) => f.key === "car_registration"),
    "car_registration ble fortsatt rapportert som manglende selv om den er utfylt",
  );
  console.log("OK  utfylt car_registration regnes som besvart");

  // 3) Whitespace-only skal fortsatt telle som tomt (unngå at " " lurer seg forbi).
  const missingWhitespace = findMissingRequiredFields(template, {
    car_registration: "   ",
  });
  assert.ok(
    missingWhitespace.some((f) => f.key === "car_registration"),
    "et felt med bare mellomrom ble feilaktig godtatt som besvart",
  );
  console.log("OK  whitespace-only verdi regnes fortsatt som ubesvart");

  // 4) Required checkbox (SJA-malen har "godkjent"): kun true teller som
  //    besvart (false er en gyldig, definert JS-verdi, men skal IKKE telle
  //    som "krysset av").
  const sjaTemplate = templateFor("sja");
  const checkboxField = sjaTemplate.sections
    .flatMap((s) => s.fields)
    .find((f) => f.kind === "checkbox" && f.required);
  assert.ok(checkboxField, 'fant ikke det kjente required checkbox-feltet ("godkjent") i sja-malen');

  const missingFalse = findMissingRequiredFields(sjaTemplate, {
    [checkboxField!.key]: false,
  });
  assert.ok(
    missingFalse.some((f) => f.key === checkboxField!.key),
    "et required checkbox-felt satt til false ble feilaktig godtatt som besvart",
  );
  const missingTrue = findMissingRequiredFields(sjaTemplate, {
    [checkboxField!.key]: true,
  });
  assert.ok(
    !missingTrue.some((f) => f.key === checkboxField!.key),
    "et required checkbox-felt satt til true ble feilaktig rapportert som manglende",
  );
  console.log("OK  required checkbox krever eksplisitt true, ikke bare et definert felt");

  console.log("Alle golden-tester for obligatoriske felt bestått.");
}

main();
