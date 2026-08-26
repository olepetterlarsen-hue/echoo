#!/usr/bin/env -S npx tsx
// Golden-test for FIXPLAN punkt 1 (BLOKKER B1): avkryssinger/valg i PDF.
// Genererer en faktisk PDF fra en fixture per dokumenttype, trekker ut teksten
// med pdf-parse og asserter at antall "[X]"-markører == antall besvarte
// spørsmål (radio/checkmark_group/yna_group/yna_measurement_group).
// Kjør: npx tsx scripts/qa/golden-pdf-checkboxes.ts

import assert from "node:assert/strict";
import { PDFParse } from "pdf-parse";
import { renderDocumentPdf } from "../../src/lib/pdf/render";
import { templateFor } from "../../src/lib/document-templates";
import type {
  SectionDef,
  YnaMeasurementResponse,
  YnaResponse,
} from "../../src/lib/document-templates/types";
import type {
  DocumentRow,
  Profile,
  Project,
  AppSettings,
} from "../../src/lib/types/database";

interface Fixture {
  data: Record<string, unknown>;
  expectedChecked: number;
}

function buildFixtureData(sections: SectionDef[]): Fixture {
  const data: Record<string, unknown> = {};
  let expectedChecked = 0;

  for (const section of sections) {
    for (const field of section.fields) {
      if (field.kind === "radio") {
        const opts = field.options ?? [];
        if (opts.length === 0) continue;
        data[field.key] = opts[0];
        expectedChecked += 1;
      } else if (field.kind === "checkmark_group") {
        const opts = field.options ?? [];
        if (opts.length === 0) continue;
        const chosen = opts.filter((_, i) => i % 2 === 0);
        data[field.key] = chosen;
        expectedChecked += chosen.length;
      } else if (
        field.kind === "yna_group" ||
        field.kind === "yna_measurement_group"
      ) {
        const items = field.items ?? [];
        const answers: Record<
          string,
          YnaResponse | YnaMeasurementResponse
        > = {};
        items.forEach((item, i) => {
          // La siste spørsmål stå ubesvart (finnes >2 items) for å teste
          // at ubesvarte spørsmål ikke gir noen markør i det hele tatt.
          if (items.length > 2 && i === items.length - 1) {
            answers[item.key] = { svar: null, kommentar: "", verdi: "" };
            return;
          }
          const svar = i % 3 === 0 ? "ja" : i % 3 === 1 ? "nei" : "uakt";
          answers[item.key] = { svar, kommentar: "", verdi: "0,12 Ω" };
          expectedChecked += 1;
        });
        data[field.key] = answers;
      }
    }
  }
  return { data, expectedChecked };
}

const SIGNER = {
  id: "00000000-0000-0000-0000-000000000001",
  full_name: "Test Testesen",
  email: "test@example.com",
} as unknown as Profile;

const PROJECT = {
  id: "00000000-0000-0000-0000-000000000002",
  project_number: "P-2026-001",
  title: "Golden-test prosjekt",
  installation_type: "bolig",
} as unknown as Project;

const SETTINGS = {
  firma: "Golden Test AS",
  org_nr: "999 999 999",
  selskap_adresse: "Testveien 1",
  selskap_postnr: "0001",
  selskap_sted: "Oslo",
  selskap_telefon: "12345678",
} as unknown as AppSettings;

async function testKind(
  kind: "samsvarserklaering" | "risikovurdering" | "sluttkontroll" | "ruh" | "startup_checklist",
  variant?: string,
) {
  const template = templateFor(kind, variant);
  const { data, expectedChecked } = buildFixtureData(template.sections);

  assert.ok(
    expectedChecked > 0,
    `${kind}: fixture ga ingen avkryssbare svar å teste — malen mangler radio/checkmark_group/yna_group-felt`,
  );

  const document = {
    id: "00000000-0000-0000-0000-000000000003",
    kind,
    data,
    status: "signert",
    version: 1,
    created_at: new Date().toISOString(),
    signed_at: new Date().toISOString(),
    signature_snapshot: null,
  } as unknown as DocumentRow & { signature_snapshot?: string | null };

  const buf = await renderDocumentPdf({
    document,
    project: PROJECT,
    signer: SIGNER,
    settings: SETTINGS,
  });

  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  await parser.destroy();
  const markerCount = (text.match(/\[X\]/g) ?? []).length;

  assert.equal(
    markerCount,
    expectedChecked,
    `${kind}: forventet ${expectedChecked} "[X]"-markører (én per besvart spørsmål), fant ${markerCount}. ` +
      `Enten mangler avkryssinger i PDF-en, eller ubesvarte spørsmål ble feilaktig markert.`,
  );

  console.log(`OK  ${kind}${variant ? `/${variant}` : ""}: ${markerCount} markører, ${buf.length} bytes`);
}

async function main() {
  await testKind("samsvarserklaering", "bolig");
  await testKind("risikovurdering");
  await testKind("sluttkontroll");
  await testKind("ruh");
  await testKind("startup_checklist");
  console.log("Alle golden-tester for PDF-avkryssinger bestått.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
