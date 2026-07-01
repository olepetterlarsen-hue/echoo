#!/usr/bin/env node
// Runtime-test av token-substitusjonslogikk.
// Duplikerer logikken fra src/lib/document-templates/tokens.ts som ren JS.

import assert from "node:assert/strict";

const LOGO_TOKEN = "$firma_logo";

const TOKENS = [
  { key: "$prosjektnummer", source: "project", sourceKey: "project.project_number", group: "prosjekt" },
  { key: "$prosjekt_tittel", source: "project", sourceKey: "project.title", group: "prosjekt" },
  { key: "$prosjekt_beskrivelse", source: "project", sourceKey: "project.description", group: "prosjekt" },
  { key: "$installasjonstype", source: "project", sourceKey: "project.installation_type", group: "prosjekt" },
  { key: "$kunde_navn", source: "project", sourceKey: "project.customer_name", group: "kunde" },
  { key: "$kunde_orgnr", source: "project", sourceKey: "project.customer_org_number", group: "kunde" },
  { key: "$kunde_kontakt", source: "project", sourceKey: "project.customer_contact", group: "kunde" },
  { key: "$kunde_epost", source: "project", sourceKey: "project.customer_email", group: "kunde" },
  { key: "$kunde_telefon", source: "project", sourceKey: "project.customer_phone", group: "kunde" },
  { key: "$kunde_adresse", source: "project", sourceKey: "project.customer_address", group: "kunde" },
  { key: "$kunde_postnr_sted", source: "project", sourceKey: "project.customer_postnr_sted", group: "kunde" },
  { key: "$anlegg_firma", source: "project", sourceKey: "project.site_company", group: "anlegg" },
  { key: "$anlegg_adresse", source: "project", sourceKey: "project.site_address_full", group: "anlegg" },
  { key: "$anlegg_postnr_sted", source: "project", sourceKey: "project.site_postnr_sted", group: "anlegg" },
  { key: "$anlegg_ssb", source: "project", sourceKey: "project.site_ssb_number", group: "anlegg" },
  { key: "$firma_navn", source: "settings", sourceKey: "firma", group: "firma" },
  { key: "$firma_orgnr", source: "settings", sourceKey: "org_nr", group: "firma" },
  { key: "$firma_adresse", source: "settings", sourceKey: "selskap_adresse", group: "firma" },
  { key: "$firma_postnr_sted", source: "settings", sourceKey: "selskap_postnr_sted", group: "firma" },
  { key: "$firma_telefon", source: "settings", sourceKey: "selskap_telefon", group: "firma" },
  { key: "$firma_epost", source: "settings", sourceKey: "selskap_epost", group: "firma" },
  { key: LOGO_TOKEN, source: "special", sourceKey: "logo", group: "firma" },
  { key: "$installator_navn", source: "settings", sourceKey: "installator_navn", group: "installator" },
  { key: "$installator_tittel", source: "settings", sourceKey: "installator_tittel", group: "installator" },
  { key: "$installator_telefon", source: "settings", sourceKey: "installator_telefon", group: "installator" },
  { key: "$installator_epost", source: "settings", sourceKey: "installator_epost", group: "installator" },
];
const TOKEN_BY_KEY = Object.fromEntries(TOKENS.map((t) => [t.key, t]));
const TOKEN_RE = /\$[a-zøæå_]+/gi;

function pickFromProject(p, sk) {
  const compact = (a) => a.filter(Boolean).join(" ").trim() || null;
  switch (sk) {
    case "project.title": return p.title ?? null;
    case "project.project_number": return p.project_number ?? null;
    case "project.description": return p.description ?? null;
    case "project.customer_name": return p.customer_name ?? null;
    case "project.customer_org_number": return p.customer_org_number ?? null;
    case "project.customer_contact": return p.customer_contact ?? null;
    case "project.customer_email": return p.customer_email ?? null;
    case "project.customer_phone": return p.customer_phone ?? null;
    case "project.customer_address": return p.customer_address ?? null;
    case "project.customer_postnr_sted": return compact([p.customer_postal_code, p.customer_city]);
    case "project.site_company": return p.site_company ?? null;
    case "project.site_address_full":
      return compact([p.site_address, p.site_house_number, p.site_house_letter, compact([p.site_postal_code, p.site_city])]);
    case "project.site_postnr_sted": return compact([p.site_postal_code, p.site_city]);
    case "project.site_ssb_number": return p.site_ssb_number ?? null;
    case "project.installation_type": return p.installation_type ?? null;
    default: return null;
  }
}

function pickFromSettings(s, sk) {
  if (!s) return null;
  const compact = (a) => a.filter(Boolean).join(" ").trim() || null;
  switch (sk) {
    case "firma": return s.firma || null;
    case "org_nr": return s.org_nr || null;
    case "selskap_adresse": return s.selskap_adresse || null;
    case "selskap_postnr_sted": return compact([s.selskap_postnr, s.selskap_sted]);
    case "selskap_telefon": return s.selskap_telefon || null;
    case "selskap_epost": return s.selskap_epost || null;
    case "installator_navn": return s.installator_navn || null;
    case "installator_tittel": return s.installator_tittel || null;
    case "installator_telefon": return s.installator_telefon || null;
    case "installator_epost": return s.installator_epost || null;
    default: return null;
  }
}

function applyTokens(text, project, settings = null) {
  if (!project && !settings) return text;
  if (!text.includes("$")) return text;
  return text.replace(TOKEN_RE, (match) => {
    const def = TOKEN_BY_KEY[match.toLowerCase()];
    if (!def) return match;
    if (def.source === "project") {
      if (!project) return match;
      return pickFromProject(project, def.sourceKey) ?? match;
    }
    if (def.source === "settings") {
      return pickFromSettings(settings, def.sourceKey) ?? match;
    }
    if (def.source === "special" && def.key === LOGO_TOKEN) {
      return match;
    }
    return match;
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
  title: "Demo-prosjekt", project_number: "2026-0042", description: "Eksempel-prosjekt",
  customer_name: "Bygg & Bo AS", customer_org_number: "923 456 789",
  customer_contact: "Kari Nordmann", customer_email: "kari@bygg-bo.no",
  customer_phone: "+47 412 34 567", customer_address: "Storgata 12",
  customer_postal_code: "0184", customer_city: "Oslo",
  site_company: "Bygg & Bo AS", site_address: "Industrivegen",
  site_house_number: "7", site_house_letter: "B",
  site_postal_code: "0184", site_city: "Oslo", site_ssb_number: "0301",
  installation_type: "bolig",
};
const settings = {
  firma: "Ola Elektro AS", org_nr: "913 456 789",
  selskap_adresse: "Elveveien 5", selskap_postnr: "0350", selskap_sted: "Oslo",
  selskap_telefon: "+47 22 33 44 55", selskap_epost: "post@ola-elektro.no",
  installator_navn: "Ola Nordmann", installator_tittel: "Faglig ansvarlig installatør",
  installator_telefon: "+47 900 12 345", installator_epost: "ola@ola-elektro.no",
};

console.log("Token runtime-tester:\n");

assert.equal(applyTokens("Hei $kunde_navn", project), "Hei Bygg & Bo AS");
console.log("  ✓ project: '$kunde_navn' → 'Bygg & Bo AS'");

assert.equal(applyTokens("Fra $firma_navn", null, settings), "Fra Ola Elektro AS");
console.log("  ✓ settings: '$firma_navn' → 'Ola Elektro AS'");

assert.equal(
  applyTokens("$firma_navn utfører for $kunde_navn på $prosjektnummer", project, settings),
  "Ola Elektro AS utfører for Bygg & Bo AS på 2026-0042",
);
console.log("  ✓ blanding project+settings");

assert.equal(
  applyTokens("Signert av $installator_navn ($installator_tittel)", null, settings),
  "Signert av Ola Nordmann (Faglig ansvarlig installatør)",
);
console.log("  ✓ installator-tokens");

assert.equal(applyTokens("HEADER: $firma_logo", project, settings), "HEADER: $firma_logo");
console.log("  ✓ $firma_logo beholdes som placeholder");

assert.equal(applyTokens("$finnes_ikke", project, settings), "$finnes_ikke");
console.log("  ✓ ukjent token beholdes");

assert.equal(applyTokens("$firma_navn", project, null), "$firma_navn");
console.log("  ✓ manglende settings gir token som placeholder");

assert.equal(
  applyTokens("$firma_navn og $firma_orgnr", null, { firma: "", org_nr: null }),
  "$firma_navn og $firma_orgnr",
);
console.log("  ✓ tomme settings-felt beholder token");

assert.equal(
  applyTokens("Kontor: $firma_postnr_sted", null, settings),
  "Kontor: 0350 Oslo",
);
console.log("  ✓ $firma_postnr_sted: '0350 Oslo'");

assert.equal(hasTokens("$kunde_navn"), true);
assert.equal(hasTokens("$firma_navn"), true);
assert.equal(hasTokens("$installator_epost"), true);
assert.equal(hasTokens("$finnes_ikke"), false);
console.log("  ✓ hasTokens registrerer alle token-typer");

const keys = new Set(TOKENS.map((t) => t.key));
assert.equal(keys.size, TOKENS.length);
console.log(`  ✓ ${TOKENS.length} unike tokens (ingen duplikater)`);

assert.equal(applyTokens("$FIRMA_NAVN", null, settings), "Ola Elektro AS");
console.log("  ✓ case-insensitive matching");

let ok = true;
for (const t of TOKENS) {
  if (t.source === "special") continue;
  const out = applyTokens(`X ${t.key} Y`, project, settings);
  if (out.includes(t.key)) {
    console.log(`  ✗ ${t.key} ble ikke substituert! ${out}`);
    ok = false;
  }
}
assert.ok(ok);
console.log(`  ✓ alle ${TOKENS.length - 1} tekst-tokens substitueres`);

console.log("\n✓ Alle runtime-tester passerer");
