#!/usr/bin/env -S npx tsx
// Golden-test: logo-fallback i PDF-header. Ekte kunde-orgs uten opplastet
// logo skal ALDRI vise Echoo sin logo (whitelabel — Roadmap #2), kun sitt
// eget firmanavn. Echoo/OPCOM sine egne demo-/interne org-er (org.nr-
// allowlist i render.tsx) får derimot Echoo-logoen som fallback.
// Kjør: npx tsx scripts/qa/golden-pdf-logo.test.ts

import assert from "node:assert/strict";
import { PDFParse } from "pdf-parse";
import { renderDocumentPdf } from "../../src/lib/pdf/render";
import type { DocumentRow, Profile, Project, AppSettings } from "../../src/lib/types/database";

const SIGNER = {
  id: "00000000-0000-0000-0000-000000000001",
  full_name: "Test Testesen",
  email: "test@example.com",
} as unknown as Profile;

const project = {
  id: "p1",
  project_number: "P-2026-003",
  title: "Golden-test logo",
  installation_type: "bolig",
  customer_name: "Ola Kunde",
  customer_address: "Kundeveien 99",
  customer_postal_code: "9999",
  customer_city: "Kundeby",
  site_address: "Anleggsveien 7",
  site_postal_code: "1234",
  site_city: "Anleggsby",
} as unknown as Project;

const document = {
  id: "00000000-0000-0000-0000-000000000006",
  kind: "samsvarserklaering",
  data: { _variant: "bolig" },
  status: "signert",
  version: 1,
  created_at: new Date().toISOString(),
  signed_at: new Date().toISOString(),
  signature_snapshot: null,
} as unknown as DocumentRow & { signature_snapshot?: string | null };

async function extractText(buf: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  await parser.destroy();
  return text;
}

async function main() {
  // Scenario A: ekte kunde-org uten opplastet logo — skal IKKE få Echoo-logo.
  const customerSettings = {
    firma: "Sørby Elektro AS",
    org_nr: "912345678",
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

  const customerText = await extractText(
    await renderDocumentPdf({ document, project, signer: SIGNER, settings: customerSettings }),
  );
  assert.doesNotMatch(
    customerText,
    /echoo/i,
    "Ekte kunde-org uten egen logo skal ALDRI vise Echoo-branding (whitelabel-brudd)",
  );
  assert.match(customerText, /SØRBY ELEKTRO AS/i, "Kunde-firmanavn mangler i tekstfallback");
  console.log("OK  kunde-org uten logo: viser eget firmanavn, ikke Echoo-logo");

  // Scenario B: Echoo sin egen demo-org (org.nr 999000001) uten opplastet
  // logo — skal få Echoo-logoen som fallback.
  const demoSettings = {
    ...customerSettings,
    firma: "Echoo Demo Elektro AS",
    org_nr: "999000001",
  } as unknown as AppSettings & { logo_url: string | null };

  const demoText = await extractText(
    await renderDocumentPdf({ document, project, signer: SIGNER, settings: demoSettings }),
  );
  assert.match(demoText, /echoo/i, "Echoo sin egen demo-org skal vise Echoo-logoen som fallback");
  console.log("OK  Echoo demo-org uten logo: viser Echoo-logo som fallback");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
