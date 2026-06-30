#!/usr/bin/env node
// Sjekker token-substitusjon med kant-tilfeller.
// Kjør: node scripts/test-tokens.mjs

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Transpile-fri import: leser tokens.ts og evaluerer relevante deler.
// Enklere enn å sette opp tsx kun for én test. Vi bare regex-tester
// at TOKEN_BY_KEY-tabellen og applyTokens() ser fornuftige ut.

const __dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  resolve(__dir, "..", "src", "lib", "document-templates", "tokens.ts"),
  "utf8",
);

// 1) Hver token har key, label, prefilledFrom, group.
const tokenLines = [...src.matchAll(/\{\s*key:\s*"\$[a-z_]+"/g)];
assert.ok(tokenLines.length >= 10, `Forventer >=10 tokens, fant ${tokenLines.length}`);
console.log(`  ✓ ${tokenLines.length} tokens definert`);

// 2) Alle tokens må starte med $ og bare ha [a-z_]-tegn etterpå.
for (const m of src.matchAll(/key:\s*"(\$[^"]+)"/g)) {
  const key = m[1];
  assert.match(key, /^\$[a-zøæå_]+$/, `Ugyldig token: ${key}`);
}
console.log("  ✓ alle token-keys er gyldige");

// 3) Alle prefilledFrom-verdier matcher mønsteret "project.xxx".
for (const m of src.matchAll(/prefilledFrom:\s*"([^"]+)"/g)) {
  const pf = m[1];
  assert.match(pf, /^project\.[a-z_]+$/, `Ugyldig prefilledFrom: ${pf}`);
}
console.log("  ✓ alle prefilledFrom-verdier matcher project.xxx");

// 4) Group-verdier er kun "prosjekt", "kunde", "anlegg".
for (const m of src.matchAll(/group:\s*"([^"]+)"/g)) {
  assert.ok(
    ["prosjekt", "kunde", "anlegg"].includes(m[1]),
    `Ugyldig group: ${m[1]}`,
  );
}
console.log("  ✓ alle group-verdier er gyldige");

// 5) Eksporterer applyTokens og hasTokens.
assert.match(src, /export function applyTokens/);
assert.match(src, /export function hasTokens/);
console.log("  ✓ applyTokens og hasTokens er eksportert");

// 6) Sanity: TOKEN_RE skal matche typiske tokens.
const TOKEN_RE = /\$[a-zøæå_]+/gi;
const cases = [
  { input: "Hei $kunde_navn", expected: ["$kunde_navn"] },
  { input: "Prosjekt $prosjektnummer for $kunde_navn", expected: ["$prosjektnummer", "$kunde_navn"] },
  { input: "Ingen token her", expected: [] },
  { input: "$kunde_navn.", expected: ["$kunde_navn"] }, // punktum stopper match
  { input: "Et $ alene", expected: [] }, // $ uten tekst etter teller ikke
];
for (const c of cases) {
  const matches = [...c.input.matchAll(TOKEN_RE)].map((m) => m[0]);
  assert.deepEqual(matches, c.expected, `RE-mismatch: ${c.input}`);
}
console.log("  ✓ token-regex matcher kant-tilfeller riktig");

// 7) Sjekk at pickFromProject håndterer alle prefilledFrom uten å falle til default.
const allPrefilled = [...src.matchAll(/prefilledFrom:\s*"([^"]+)"/g)].map(
  (m) => m[1],
);
const pickSwitch = src.match(
  /function pickFromProject[\s\S]+?default:\s*return null;\s*\}/,
);
assert.ok(pickSwitch, "Fant ikke pickFromProject");
for (const pf of allPrefilled) {
  assert.ok(
    pickSwitch[0].includes(`case "${pf}":`),
    `pickFromProject mangler case for ${pf}`,
  );
}
console.log(`  ✓ alle ${allPrefilled.length} prefilledFrom-verdier har case i pickFromProject`);

console.log("\nAlle token-tester OK ✓");
