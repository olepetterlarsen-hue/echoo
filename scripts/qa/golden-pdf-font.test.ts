#!/usr/bin/env -S npx tsx
// Golden-test for FIXPLAN punkt 4 (A3): PDF-fonten må dekke Ω Δ µ ° ² ³ ± ø æ å.
// Uten Font.register av en Unicode-font ble Ω tidligere til "©" i Standard-14
// Helvetica (WinAnsi-encoding).
// Kjør: npx tsx scripts/qa/golden-pdf-font.test.ts

import assert from "node:assert/strict";
import { PDFParse } from "pdf-parse";
import { renderDocumentPdf } from "../../src/lib/pdf/render";
import { templateFor } from "../../src/lib/document-templates";
import type { DocumentRow, Profile, AppSettings } from "../../src/lib/types/database";
import type { YnaMeasurementResponse } from "../../src/lib/document-templates/types";

const SIGNER = {
  id: "00000000-0000-0000-0000-000000000001",
  full_name: "Test Testesen",
  email: "test@example.com",
} as unknown as Profile;

const SETTINGS = {
  firma: "Golden Test AS",
  org_nr: "999 999 999",
} as unknown as AppSettings & { logo_url: string | null };

async function main() {
  const template = templateFor("sluttkontroll");

  // 1) Fritekstfelt med alle special-tegnene FIXPLAN nevner.
  const specialChars = "Ω Δ µF °C m² m³ ± ø æ å";
  const data: Record<string, unknown> = { site_id: specialChars };

  // 2) Et yna_measurement_group-felt (måling/prøving) med en lang verdi som
  //    inneholder Ω — den faktiske scenarioen fra symptomet (isolasjonsmåling).
  const measurementField = template.sections
    .flatMap((s) => s.fields)
    .find((f) => f.kind === "yna_measurement_group");
  assert.ok(measurementField, "fant ingen yna_measurement_group-felt i sluttkontroll-malen å teste mot");
  const firstItem = measurementField!.items?.[0];
  assert.ok(firstItem, "yna_measurement_group-feltet har ingen items");
  const longValue = ">500 MΩ @ 500 V DC, isolasjonsmåling mellom leder og jord";
  assert.ok(longValue.length > 30, "test-verdien må være over 30 tegn for å teste wrap");
  const answers: Record<string, YnaMeasurementResponse> = {
    [firstItem!.key]: { svar: "ja", kommentar: "", verdi: longValue },
  };
  data[measurementField!.key] = answers;

  const document = {
    id: "00000000-0000-0000-0000-000000000003",
    kind: "sluttkontroll",
    data,
    status: "signert",
    version: 1,
    created_at: new Date().toISOString(),
    signed_at: new Date().toISOString(),
    signature_snapshot: null,
  } as unknown as DocumentRow & { signature_snapshot?: string | null };

  const buf = await renderDocumentPdf({
    document,
    project: null,
    signer: SIGNER,
    settings: SETTINGS,
  });

  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  await parser.destroy();

  for (const ch of ["Ω", "Δ", "µ|μ", "°", "²", "³", "±", "ø", "æ", "å"]) {
    // µ (U+00B5 MICRO SIGN) rundtripper som μ (U+03BC GREEK SMALL LETTER MU)
    // gjennom PDF-ens ToUnicode-tabell — samme glyf i DejaVu Sans, begge er
    // korrekt. Godtar begge i testen.
    assert.match(
      text,
      new RegExp(ch),
      `Tegnet "${ch}" mangler i uttrukket PDF-tekst — fonten dekker det ikke (A3)`,
    );
  }
  assert.doesNotMatch(
    text,
    /©/,
    "Fant «©» i teksten — tegn på at Ω fortsatt blir feil-rendret som i det opprinnelige symptomet",
  );

  // Den lange måleverdien skal fortsatt være fullt til stede i teksten (ikke
  // avkuttet) — men flexShrink+wrap-fiksen gjør at pdf-parse setter
  // linjeskift (og noen ganger orddeling med "-") der cellen faktisk bryter
  // linjen. Det ER selve beviset på at wrap-fiksen virker, i stedet for at
  // verdien flyter ut av cellen som ett sammenhengende stykke. Sammenlign
  // derfor med whitespace og bindestreker fjernet — bare tegninnholdet
  // (ikke linjebruddene) skal være uendret.
  const clean = (s: string) => s.replace(/[\s-]+/g, "").toLowerCase();
  const snippet = text.slice(text.indexOf("MΩ") - 40, text.indexOf("MΩ") + 150);
  assert.ok(
    clean(snippet).includes(clean(longValue)),
    `Den lange måleverdien ble kuttet i PDF-teksten (utover linjebrudd/orddeling fra wrapping). Fikk: ${JSON.stringify(snippet)}`,
  );

  console.log("OK  alle special-tegn (Ω Δ µ ° ² ³ ± ø æ å) rendres korrekt i PDF-tekst");
  console.log("OK  lang måleverdi med Ω er fullt til stede (ikke avkuttet)");
  console.log("Alle golden-tester for PDF-font bestått.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
