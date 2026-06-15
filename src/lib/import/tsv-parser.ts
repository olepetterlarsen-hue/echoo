// Generisk TSV/CSV-parser tilpasset Excel "paste fra utklippstavle"-flyt.
// Excel kopierer som tab-separert (TSV) når du markerer celler.

import { parseCsv } from "./csv-parser";

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

// Auto-detekterer separator: tab → TSV (Excel paste), komma → CSV, semikolon → europeisk Excel.
export function parseExcelOrCsv(text: string): ParsedTable {
  if (!text || !text.trim()) {
    return { headers: [], rows: [] };
  }

  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const firstLine = text.split(/\r?\n/, 1)[0];
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;

  let allRows: string[][];

  if (tabCount > 0 && tabCount >= commaCount && tabCount >= semicolonCount) {
    // TSV — Excel paste
    allRows = text
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .map((line) => line.split("\t"));
  } else if (semicolonCount > commaCount) {
    // Europeisk CSV med ; — bruk samme parser men bytt ut delimiter midlertidig
    // Trygt nok når quoted fields ikke inneholder semikolon
    allRows = parseCsv(text.replace(/;/g, ","));
  } else {
    allRows = parseCsv(text);
  }

  if (allRows.length === 0) return { headers: [], rows: [] };

  const headers = allRows[0].map((h) => h.trim());
  const rows = allRows
    .slice(1)
    .map((r) => r.map((c) => (c ?? "").trim()))
    .filter((r) => r.some((c) => c.length > 0)); // dropp tomme rader

  return { headers, rows };
}

// Bygg index-map fra header til kolonne-index (case-insensitive, fleksibel).
// Returnerer -1 hvis ikke funnet.
export function indexFor(
  headers: string[],
  candidates: string[],
): number {
  const lower = headers.map((h) => h.toLowerCase().replace(/[\s_\-./]+/g, ""));
  for (const cand of candidates) {
    const target = cand.toLowerCase().replace(/[\s_\-./]+/g, "");
    const idx = lower.indexOf(target);
    if (idx !== -1) return idx;
  }
  return -1;
}

// Bygg CSV-tekst fra rader (for nedlasting av mal).
export function buildCsv(headers: string[], rows: string[][]): string {
  function escapeCell(s: string): string {
    if (/[",\n\r;]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }
  const lines = [headers.map(escapeCell).join(",")];
  for (const r of rows) {
    lines.push(r.map(escapeCell).join(","));
  }
  return "﻿" + lines.join("\n");
}
