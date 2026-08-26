#!/usr/bin/env -S npx tsx
// Golden-test for FIXPLAN punkt 7 (BLOKKER B4): PDF-kapittelet "Vedlegg —
// bilder" skal inneholde bildetekst per vedlegg og kun vises når det
// faktisk finnes vedlegg.
// Kjør: npx tsx scripts/qa/golden-pdf-attachments.test.ts

import assert from "node:assert/strict";
import { PDFParse } from "pdf-parse";
import { renderDocumentPdf, type PdfAttachment } from "../../src/lib/pdf/render";
import type { DocumentRow, Profile, AppSettings } from "../../src/lib/types/database";

// Minimal gyldig 1x1 PNG (rød piksel) — nok til at @react-pdf/renderer kan
// dekode og legge inn bildet, uten å måtte lese en ekte fil fra disk.
const TINY_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const SIGNER = {
  id: "00000000-0000-0000-0000-000000000001",
  full_name: "Test Testesen",
  email: "test@example.com",
} as unknown as Profile;

const SETTINGS = {
  firma: "Golden Test AS",
} as unknown as AppSettings & { logo_url: string | null };

function baseDocument(): DocumentRow & { signature_snapshot?: string | null } {
  return {
    id: "00000000-0000-0000-0000-000000000003",
    kind: "ruh",
    data: {},
    status: "signert",
    version: 1,
    created_at: new Date().toISOString(),
    signed_at: new Date().toISOString(),
    signature_snapshot: null,
  } as unknown as DocumentRow & { signature_snapshot?: string | null };
}

async function extractText(buf: Buffer): Promise<{ text: string; pages: number }> {
  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  const info = await parser.getInfo();
  await parser.destroy();
  return { text, pages: info.total ?? 0 };
}

async function main() {
  // 1) Uten vedlegg: kapittelet skal ikke vises i det hele tatt.
  const noAttachBuf = await renderDocumentPdf({
    document: baseDocument(),
    project: null,
    signer: SIGNER,
    settings: SETTINGS,
  });
  const { text: noAttachText } = await extractText(noAttachBuf);
  assert.doesNotMatch(
    noAttachText,
    /Vedlegg — bilder/,
    "Vedlegg-kapittelet vises selv uten noen vedlegg",
  );
  console.log("OK  ingen vedlegg → ingen «Vedlegg — bilder»-kapittel");

  // 2) Med 3 vedlegg: kapittelet skal vises, med filnavn + dato som
  //    bildetekst for HVER av dem.
  const attachments: PdfAttachment[] = [
    { dataUrl: TINY_PNG_DATA_URL, filename: "sikringsskap.jpg", date: "2026-08-19T10:00:00Z" },
    { dataUrl: TINY_PNG_DATA_URL, filename: "jordfeiltest.jpg", date: "2026-08-19T10:05:00Z" },
    { dataUrl: TINY_PNG_DATA_URL, filename: "kursfortegnelse.jpg", date: "2026-08-19T10:10:00Z" },
  ];
  const buf = await renderDocumentPdf({
    document: baseDocument(),
    project: null,
    signer: SIGNER,
    settings: SETTINGS,
    attachments,
  });
  const { text, pages } = await extractText(buf);

  assert.match(text, /Vedlegg — bilder/, "Vedlegg-kapittelet mangler selv med 3 vedlegg");
  for (const a of attachments) {
    assert.match(
      text,
      new RegExp(a.filename.replace(".", "\\.")),
      `Bildeteksten for "${a.filename}" mangler i PDF-teksten`,
    );
  }
  assert.match(text, /19\.08\.2026/, "Datoen i bildeteksten er ikke formatert som forventet (dd.mm.åååå)");
  assert.ok(pages >= 2, `forventet minst 2 sider (hoveddokument + vedleggskapittel på egen side), fikk ${pages}`);
  console.log(`OK  3 vedlegg → kapittel med alle 3 filnavn + dato som bildetekst, ${pages} sider`);

  console.log("Alle golden-tester for PDF-vedlegg bestått.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
