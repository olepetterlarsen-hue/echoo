#!/usr/bin/env node
// Statiske sjekker av tokens.ts.
// Kjør: node scripts/test-tokens.mjs

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  resolve(__dir, "..", "src", "lib", "document-templates", "tokens.ts"),
  "utf8",
);

// 1) Hver token har key, label, source, sourceKey, group.
const tokenLines = [...src.matchAll(/\{\s*key:\s*"?\$[a-z_øæå]+"/gi)];
assert.ok(
  tokenLines.length >= 15,
  `Forventer >=15 tokens, fant ${tokenLines.length}`,
);
console.log(`  ✓ ${tokenLines.length} tokens definert`);

// 2) Alle tokens må starte med $ og bare ha [a-z_]-tegn etterpå.
for (const m of src.matchAll(/key:\s*"(\$[^"]+)"/g)) {
  assert.match(m[1], /^\$[a-zøæå_]+$/, `Ugyldig token-key: ${m[1]}`);
}
console.log("  ✓ alle token-keys er gyldige");

// 3) Alle source-verdier er blant de 3 tillatte.
for (const m of src.matchAll(/source:\s*"([^"]+)"/g)) {
  assert.ok(
    ["project", "settings", "special"].includes(m[1]),
    `Ugyldig source: ${m[1]}`,
  );
}
console.log("  ✓ alle source-verdier er gyldige (project/settings/special)");

// 4) Alle project-tokens har sourceKey som matcher "project.xxx".
const projectTokens = [
  ...src.matchAll(
    /source:\s*"project"[\s\S]*?sourceKey:\s*"([^"]+)"/g,
  ),
];
for (const m of projectTokens) {
  assert.match(m[1], /^project\.[a-z_]+$/, `Ugyldig project sourceKey: ${m[1]}`);
}
console.log(`  ✓ alle ${projectTokens.length} project-tokens har gyldig sourceKey`);

// 5) Group-verdier er blant de 5 tillatte.
const validGroups = ["prosjekt", "kunde", "anlegg", "firma", "installator"];
for (const m of src.matchAll(/group:\s*"([^"]+)"/g)) {
  assert.ok(validGroups.includes(m[1]), `Ugyldig group: ${m[1]}`);
}
console.log("  ✓ alle group-verdier er gyldige");

// 6) Eksporterer applyTokens og hasTokens.
assert.match(src, /export function applyTokens/);
assert.match(src, /export function hasTokens/);
assert.match(src, /export function samplePreviewProject/);
assert.match(src, /export function samplePreviewSettings/);
console.log("  ✓ applyTokens/hasTokens/sample-funksjoner er eksportert");

// 7) Sanity: TOKEN_RE skal matche typiske tokens.
const TOKEN_RE = /\$[a-zøæå_]+/gi;
const cases = [
  { input: "Hei $kunde_navn", expected: ["$kunde_navn"] },
  {
    input: "Prosjekt $prosjektnummer for $firma_navn",
    expected: ["$prosjektnummer", "$firma_navn"],
  },
  { input: "Ingen token her", expected: [] },
  { input: "$kunde_navn.", expected: ["$kunde_navn"] },
  { input: "Et $ alene", expected: [] },
];
for (const c of cases) {
  const matches = [...c.input.matchAll(TOKEN_RE)].map((m) => m[0]);
  assert.deepEqual(matches, c.expected, `RE-mismatch: ${c.input}`);
}
console.log("  ✓ token-regex matcher kant-tilfeller riktig");

// 8) Sjekk at pickFromProject har case for hver project-sourceKey.
const pickProjectSwitch = src.match(
  /function pickFromProject[\s\S]+?default:\s*return null;\s*\}/,
);
assert.ok(pickProjectSwitch, "Fant ikke pickFromProject");
for (const m of projectTokens) {
  assert.ok(
    pickProjectSwitch[0].includes(`case "${m[1]}":`),
    `pickFromProject mangler case for ${m[1]}`,
  );
}
console.log(`  ✓ pickFromProject har case for alle ${projectTokens.length} project-tokens`);

// 9) Sjekk at pickFromSettings har case for hver settings-sourceKey.
const settingsTokens = [
  ...src.matchAll(
    /source:\s*"settings"[\s\S]*?sourceKey:\s*"([^"]+)"/g,
  ),
];
const pickSettingsSwitch = src.match(
  /function pickFromSettings[\s\S]+?default:\s*return null;\s*\}/,
);
assert.ok(pickSettingsSwitch, "Fant ikke pickFromSettings");
for (const m of settingsTokens) {
  assert.ok(
    pickSettingsSwitch[0].includes(`case "${m[1]}":`),
    `pickFromSettings mangler case for ${m[1]}`,
  );
}
console.log(`  ✓ pickFromSettings har case for alle ${settingsTokens.length} settings-tokens`);

// 10) $firma_logo er spesial.
assert.ok(src.includes('LOGO_TOKEN = "$firma_logo"'));
assert.ok(src.includes('source: "special"'));
console.log("  ✓ $firma_logo er definert som special-token");

console.log("\nAlle statiske tester OK ✓");
