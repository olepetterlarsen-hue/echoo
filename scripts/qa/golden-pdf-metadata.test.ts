#!/usr/bin/env -S npx tsx
// Golden-test for FIXPLAN punkt 3 (A1, A2, A4): status, installatørblokk,
// anleggsadresse (med fallback til kunde) og spørsmålstelling i PDF.
// Kjør: npx tsx scripts/qa/golden-pdf-metadata.test.ts

import assert from "node:assert/strict";
import { PDFParse } from "pdf-parse";
import { renderDocumentPdf } from "../../src/lib/pdf/render";
import { templateFor } from "../../src/lib/document-templates";
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

function expectedQuestionCount(sections: ReturnType<typeof templateFor>["sections"]): number {
  return sections.reduce(
    (n, s) =>
      n +
      s.fields.reduce((m, f) => {
        if (f.kind === "info") return m;
        if (f.kind === "yna_group" || f.kind === "yna_measurement_group") {
          return m + (f.items?.length ?? 0);
        }
        if (f.kind === "risk_assessment_group") {
          return m + (f.riskItems?.length ?? 0);
        }
        return m + 1;
      }, 0),
    0,
  );
}

async function extractText(buf: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  await parser.destroy();
  return text;
}

async function main() {
  const template = templateFor("samsvarserklaering", "bolig");
  const expectedCount = expectedQuestionCount(template.sections);
  assert.ok(expectedCount > 0, "fixture-mal ga 0 forventede spørsmål");

  const document = {
    id: "00000000-0000-0000-0000-000000000003",
    kind: "samsvarserklaering",
    data: {},
    status: "signert",
    version: 2,
    created_at: new Date().toISOString(),
    signed_at: new Date().toISOString(),
    signature_snapshot: null,
  } as unknown as DocumentRow & { signature_snapshot?: string | null };

  // Scenario A: site utfylt — skal vinne over kundeadressen.
  const projectWithSite = {
    id: "p1",
    project_number: "P-2026-001",
    title: "Golden-test prosjekt",
    installation_type: "bolig",
    customer_name: "Ola Kunde",
    customer_address: "Kundeveien 99",
    customer_postal_code: "9999",
    customer_city: "Kundeby",
    site_address: "Anleggsveien 7",
    site_house_number: null,
    site_house_letter: null,
    site_postal_code: "1234",
    site_city: "Anleggsby",
  } as unknown as Project;

  const textA = await extractText(
    await renderDocumentPdf({ document, project: projectWithSite, signer: SIGNER, settings: SETTINGS }),
  );

  assert.doesNotMatch(textA, /Utkast/, "Signert PDF skal aldri inneholde ordet «Utkast» (A1)");
  assert.match(textA, /Signert\s*·\s*v2/, "Status-linjen skal vise «Signert · v2»");
  assert.match(textA, /Kari Installatør/, "Installatørblokk mangler navn (A2)");
  assert.match(textA, /999 999 999/, "Installatørblokk mangler org.nr (A2)");
  assert.match(textA, /Anleggsveien 7/, "Anleggsadresse fra site vises ikke (A2)");
  assert.doesNotMatch(
    textA,
    /Kundeveien 99/,
    "Site-adresse er utfylt, men kundeadressen ble brukt likevel (skal ikke skje)",
  );
  assert.match(
    textA,
    new RegExp(`${expectedCount} spørsmål`),
    `«Totalt antall spørsmål» stemmer ikke — forventet ${expectedCount} (A4/I-20)`,
  );
  console.log("OK  scenario A (site utfylt): status/installatør/anlegg/telling korrekt");

  // Scenario B: site tomt — skal arve kundens adresse.
  const projectNoSite = {
    ...projectWithSite,
    id: "p2",
    site_address: null,
    site_house_number: null,
    site_house_letter: null,
    site_postal_code: null,
    site_city: null,
  } as unknown as Project;

  const textB = await extractText(
    await renderDocumentPdf({ document, project: projectNoSite, signer: SIGNER, settings: SETTINGS }),
  );
  assert.match(textB, /Kundeveien 99/, "Anleggsadresse arvet ikke fra kunde når site er tomt (A2)");
  console.log("OK  scenario B (site tomt): arver kundens adresse");

  console.log("Alle golden-tester for PDF-metadata bestått.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
