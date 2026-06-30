#!/usr/bin/env node
// Runtime-test av token-substitusjonslogikk.
// Duplikerer logikken fra src/lib/document-templates/tokens.ts som ren JS
// så vi slipper TS-transpilering. Det statiske testet (test-tokens.mjs)
// verifiserer at TS-kildefilen matcher mønstrene som testes her.

import assert from "node:assert/strict";

// ============ DUPLIKAT AV tokens.ts (kun runtime-logikken) ============

const TOKENS = [
  { key: "$prosjektnummer", prefilledFrom: "project.project_number", group: "prosjekt" },
  { key: "$prosjekt_tittel", prefilledFrom: "project.title", group: "prosjekt" },
  { key: "$prosjekt_beskrivelse", prefilledFrom: "project.description", group: "prosjekt" },
  { key: "$installasjonstype", prefilledFrom: "project.installation_type", group: "prosjekt" },
  { key: "$kunde_navn", prefilledFrom: "project.customer_name", group: "kunde" },
  { key: "$kunde_orgnr", prefilledFrom: "project.customer_org_number", group: "kunde" },
  { key: "$kunde_kontakt", prefilledFrom: "project.customer_contact", group: "kunde" },
  { key: "$kunde_epost", prefilledFrom: "project.customer_email", group: "kunde" },
  { key: "$kunde_telefon", prefilledFrom: "project.customer_phone", group: "kunde" },
  { key: "$kunde_adresse", prefilledFrom: "project.customer_address", group: "kunde" },
  { key: "$kunde_postnr_sted", prefilledFrom: "project.customer_postnr_sted", group: "kunde" },
  { key: "$anlegg_firma", prefilledFrom: "project.site_company", group: "anlegg" },
  { key: "$anlegg_adresse", prefilledFrom: "project.site_address_full", group: "anlegg" },
  { key: "$anlegg_postnr_sted", prefilledFrom: "project.site_postnr_sted", group: "anlegg" },
  { key: "$anlegg_ssb", prefilledFrom: "project.site_ssb_number", group: "anlegg" },
];
const TOKEN_BY_KEY = Object.fromEntries(TOKENS.map((t) => [t.key, t]));
const TOKEN_RE = /\$[a-zøæå_]+/gi;

function pickFromProject(p, prefilledFrom) {
  const compact = (parts) => parts.filter(Boolean).join(" ").trim() || null;
  switch (prefilledFrom) {
    case "project.title": return p.title ?? null;
    case "project.project_number": return p.project_number ?? null;
    case "project.description": return p.description ?? null;
    case "project.customer_name": return p.customer_name ?? null;
    case "project.customer_org_number": return p.customer_org_number ?? null;
    case "project.customer_contact": return p.customer_contact ?? null;
    case "project.customer_email": return p.customer_email ?? null;
    case "project.customer_phone": return p.customer_phone ?? null;
    case "project.customer_address": return p.customer_address ?? null;
    case "project.customer_postnr_sted":
      return compact([p.customer_postal_code, p.customer_city]);
    case "project.site_company": return p.site_company ?? null;
    case "project.site_address": return p.site_address ?? null;
    case "project.site_address_full":
      return compact([
        p.site_address,
        p.site_house_number,
        p.site_house_letter,
        compact([p.site_postal_code, p.site_city]),
      ]);
    case "project.site_postnr_sted":
      return compact([p.site_postal_code, p.site_city]);
    case "project.site_ssb_number": return p.site_ssb_number ?? null;
    case "project.installation_type": return p.installation_type ?? null;
    default: return null;
  }
}

function applyTokens(text, project) {
  if (!project) return text;
  if (!text.includes("$")) return text;
  return text.replace(TOKEN_RE, (match) => {
    const def = TOKEN_BY_KEY[match.toLowerCase()];
    if (!def) return match;
    const value = pickFromProject(project, def.prefilledFrom);
    return value ?? match;
  });
}

function hasTokens(text) {
  if (!text.includes("$")) return false;
  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (TOKEN_BY_KEY[m[0].toLowerCase()]) return true;
  }
  return false;
}

const project = {
  title: "Demo-prosjekt",
  project_number: "2026-0042",
  description: "Eksempel-prosjekt",
  customer_name: "Bygg & Bo AS",
  customer_org_number: "923 456 789",
  customer_contact: "Kari Nordmann",
  customer_email: "kari@bygg-bo.no",
  customer_phone: "+47 412 34 567",
  customer_address: "Storgata 12",
  customer_postal_code: "0184",
  customer_city: "Oslo",
  site_company: "Bygg & Bo AS",
  site_address: "Industrivegen",
  site_house_number: "7",
  site_house_letter: "B",
  site_postal_code: "0184",
  site_city: "Oslo",
  site_ssb_number: "0301",
  installation_type: "bolig",
};

// ============ TESTER ============

console.log("Token runtime-tester:\n");

// 1) Enkelt substitusjon
assert.equal(applyTokens("Hei $kunde_navn", project), "Hei Bygg & Bo AS");
console.log("  ✓ enkelt: '$kunde_navn' → 'Bygg & Bo AS'");

// 2) Flere tokens
assert.equal(
  applyTokens("Prosjekt $prosjektnummer for $kunde_navn", project),
  "Prosjekt 2026-0042 for Bygg & Bo AS",
);
console.log("  ✓ flere tokens i samme streng");

// 3) Ukjent token beholdes
assert.equal(applyTokens("Hei $finnes_ikke", project), "Hei $finnes_ikke");
console.log("  ✓ ukjent token beholdes som råtekst");

// 4) Tom streng
assert.equal(applyTokens("", project), "");
console.log("  ✓ tom streng returnerer tom");

// 5) Ingen tokens
assert.equal(applyTokens("Bare vanlig tekst", project), "Bare vanlig tekst");
console.log("  ✓ tekst uten tokens uendret");

// 6) Null project
assert.equal(applyTokens("Hei $kunde_navn", null), "Hei $kunde_navn");
console.log("  ✓ null project gir uendret tekst");

// 7) Kombinert adresse
const adr = applyTokens("Anlegg: $anlegg_adresse", project);
assert.ok(adr.includes("Industrivegen"));
assert.ok(adr.includes("7"));
assert.ok(adr.includes("Oslo"));
console.log(`  ✓ $anlegg_adresse: '${adr.replace("Anlegg: ", "")}'`);

// 8) Token med etterfølgende tegnsetting
assert.equal(applyTokens("$kunde_navn.", project), "Bygg & Bo AS.");
console.log("  ✓ token med etterfølgende punktum");

// 9) hasTokens
assert.equal(hasTokens("Hei $kunde_navn"), true);
assert.equal(hasTokens("Hei"), false);
assert.equal(hasTokens("$finnes_ikke"), false);
assert.equal(hasTokens("$"), false);
console.log("  ✓ hasTokens identifiserer kjente vs ukjente tokens");

// 10) Alle 15 tokens substitueres
let allSubstituted = true;
for (const t of TOKENS) {
  const out = applyTokens(`X ${t.key} Y`, project);
  if (out.includes(t.key)) {
    console.log(`  ✗ ${t.key} ble ikke substituert! Output: ${out}`);
    allSubstituted = false;
  }
}
assert.ok(allSubstituted);
console.log(`  ✓ alle ${TOKENS.length} tokens substitueres med sample-data`);

// 11) Case-insensitive
assert.equal(applyTokens("$Kunde_Navn", project), "Bygg & Bo AS");
console.log("  ✓ case-insensitive token-matching");

// 12) Manglende felt på Project (null) — token beholdes
const partial = { customer_name: null };
assert.equal(applyTokens("Hei $kunde_navn", partial), "Hei $kunde_navn");
console.log("  ✓ null-verdi i project beholder token (varsler bruker)");

// 13) Cursor-insert-hjelperen (insertAtCursor-equivalent)
// Spacing-test: skal sette space før hvis prev ikke ender med whitespace
function insertAtCursor(currentValue, token, start, end) {
  const before = currentValue.slice(0, start);
  const after = currentValue.slice(end);
  const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
  const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);
  return (
    before + (needsSpaceBefore ? " " : "") + token + (needsSpaceAfter ? " " : "") + after
  );
}
assert.equal(insertAtCursor("Hei", "$kunde_navn", 3, 3), "Hei $kunde_navn");
assert.equal(insertAtCursor("Hei ", "$kunde_navn", 4, 4), "Hei $kunde_navn");
assert.equal(insertAtCursor("ABC", "$x", 0, 0), "$x ABC");
assert.equal(insertAtCursor("ABC", "$x", 3, 3), "ABC $x");
assert.equal(insertAtCursor("ABCD", "$x", 2, 2), "AB $x CD");
console.log("  ✓ insertAtCursor håndterer cursor-posisjon og spacing");

console.log("\n✓ Alle 13 runtime-tester passerer");
