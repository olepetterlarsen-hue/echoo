#!/usr/bin/env -S npx tsx
// Golden-test: sjekkliste-/avkrysningsfelt (checkmark_group, yna_group, checkbox)
// skal faktisk vise utfylte verdier i PDF-en. Reprodusert etter brukerrapport
// om at utfylte sjekklistepunkter ikke dukket opp i PDF-utskriften.
// Kjør: npx tsx scripts/qa/golden-pdf-checklist.test.ts

import assert from "node:assert/strict";
import { PDFParse } from "pdf-parse";
import { renderDocumentPdf } from "../../src/lib/pdf/render";
import type { DocumentRow, Profile, Project, AppSettings } from "../../src/lib/types/database";

const SIGNER = {
  id: "00000000-0000-0000-0000-000000000001",
  full_name: "Test Testesen",
  email: "test@example.com",
} as unknown as Profile;

const SETTINGS = {
  firma: "Golden Test AS",
  org_nr: "999 999 999",
  selskap_adresse: "Testveien 1",
  selskap_postnr: "0001",
  selskap_sted: "Oslo",
  selskap_telefon: "12345678",
  installator_navn: "Kari Installatør",
  installator_tittel: "Bemyndiget person",
  installator_telefon: "90000000",
  installator_epost: "kari@example.com",
  logo_url: null,
} as unknown as AppSettings & { logo_url: string | null };

async function extractText(buf: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  await parser.destroy();
  return text;
}

async function main() {
  const document = {
    id: "00000000-0000-0000-0000-000000000004",
    kind: "samsvarserklaering",
    // type_arbeid og type_spenning er checkmark_group-felt i samsvar/bolig.ts.
    data: {
      _variant: "bolig",
      type_arbeid: ["Nyanlegg", "Kabel"],
      type_spenning: ["230V AC"],
    },
    status: "signert",
    version: 1,
    created_at: new Date().toISOString(),
    signed_at: new Date().toISOString(),
    signature_snapshot: null,
  } as unknown as DocumentRow & { signature_snapshot?: string | null };

  const project = {
    id: "p1",
    project_number: "P-2026-002",
    title: "Golden-test sjekkliste",
    installation_type: "bolig",
    customer_name: "Ola Kunde",
    customer_address: "Kundeveien 99",
    customer_postal_code: "9999",
    customer_city: "Kundeby",
    site_address: "Anleggsveien 7",
    site_postal_code: "1234",
    site_city: "Anleggsby",
  } as unknown as Project;

  const text = await extractText(
    await renderDocumentPdf({ document, project, signer: SIGNER, settings: SETTINGS }),
  );

  assert.match(text, /Nyanlegg/, "checkmark_group-verdi «Nyanlegg» mangler i PDF");
  assert.match(text, /Kabel/, "checkmark_group-verdi «Kabel» mangler i PDF");
  assert.match(text, /230V AC/, "checkmark_group-verdi «230V AC» mangler i PDF");
  console.log("OK  checkmark_group-verdier vises korrekt i PDF");

  // Scenario 2: yna_group (ja/nei/uaktuelt-sjekkliste), brukt i SJA-malen.
  const sjaDocument = {
    id: "00000000-0000-0000-0000-000000000005",
    kind: "sja",
    data: {
      beredskap: {
        rommeligheter: { svar: "ja", kommentar: "Kontrollert ved oppstart" },
        forstehjelp: { svar: "nei", kommentar: "Mangler førstehjelpskrin i bil" },
      },
    },
    status: "signert",
    version: 1,
    created_at: new Date().toISOString(),
    signed_at: new Date().toISOString(),
    signature_snapshot: null,
  } as unknown as DocumentRow & { signature_snapshot?: string | null };

  const sjaText = await extractText(
    await renderDocumentPdf({ document: sjaDocument, project, signer: SIGNER, settings: SETTINGS }),
  );

  assert.match(
    sjaText,
    /Kontrollert ved oppstart/,
    "yna_group-kommentar «Kontrollert ved oppstart» mangler i PDF",
  );
  assert.match(
    sjaText,
    /Mangler førstehjelpskrin i bil/,
    "yna_group-kommentar «Mangler førstehjelpskrin i bil» mangler i PDF",
  );
  assert.match(sjaText, /Rømningsveier kjent/, "yna_group spørsmålstekst mangler i PDF");
  console.log("OK  yna_group-verdier (sjekkliste ja/nei/uakt) vises korrekt i PDF");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
