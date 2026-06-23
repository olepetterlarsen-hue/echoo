#!/usr/bin/env node
// Markerer issue_reports som "loest" (eller hva som matcher app-status-enum).
// Bruker SUPABASE_SERVICE_ROLE_KEY for å bypasse RLS.
//
// Kjør: node scripts/mark-issues-resolved.mjs

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (!m) continue;
    const [, k, v] = m;
    if (!process.env[k]) {
      process.env[k] = v.replace(/^['"]|['"]$/g, "");
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

// Issues løst i batchen 2026-06-22 + Eriks selv-lukkede #15.
const RESOLUTIONS = [
  {
    id: "d990d2a6-2a29-4488-b2c5-2f492a1940ea",
    issue: "#4 Skjemaer feilmelding-lockout",
    note: "Løst 2026-06-22: localStorage-backup + gjenopprett-banner, dismiss-knapp på error, 'ta så lang tid'-hint. Commit e5542a2.",
  },
  {
    id: "79380da6-9228-4f27-95e3-ab1c61f95259",
    issue: "#12 Dashboard sticky +-knapp",
    note: "Løst 2026-06-22: global QuickCreate-FAB synlig på alle sider. Commit e5542a2.",
  },
  {
    id: "00cee14b-15b7-4284-8eab-85082cc5ec0d",
    issue: "#21 CSV bulk-import",
    note: "Løst 2026-06-22: customer_type/first_name/last_name kobles nå hele veien til DB. Privat/bedrift-toggle lagt til. Commit e5542a2.",
  },
  {
    id: "728022d5-b5b1-47a7-8249-ef8ba6192745",
    issue: "#26 iPad trackpad/mus-nav",
    note: "Løst 2026-06-22: touch-action: manipulation + pointer:fine media query forcer desktop-sidebar på iPad med trackpad. Commit e5542a2.",
  },
  {
    id: "7e6768a9-c429-4fb9-b4c4-78627e047ce1",
    issue: "#2 OPCOM-navn i stikkprøvekontroll",
    note: "Løst 2026-06-22: hardkodet OPCOM-streng fjernet fra stikkprovekontroll.ts + email-footer. Commit e5542a2.",
  },
  {
    id: "09d83978-7836-4fa4-9a85-b17c408580d2",
    issue: "#5 Avvik åpne vs alle",
    note: "Løst 2026-06-22: 'Åpne' → 'Aktive' + tooltips på alle filterknapper. Commit e5542a2.",
  },
  {
    id: "227924c1-0baa-4f35-ba69-77c31ba0f818",
    issue: "#11 Redigere stadium",
    note: "Løst 2026-06-22: stadium-navn er nå inline-redigerbart, fargevelger alltid synlig. Commit e5542a2.",
  },
  {
    id: "71ceb339-8f9c-47f3-ad24-40980c2248a6",
    issue: "#25 Brønnøysund + unik orgnr",
    note: "Løst 2026-06-22: 'Slå opp'-knapp i kunde-form henter firmadata fra brreg.no. UNIQUE-constraint på (organization_id, org_number) — migration 065 må kjøres på prod. Commit e5542a2.",
  },
  {
    id: "f60627da-431c-48ea-b151-4abb79ff5a7e",
    issue: "#22 Privat/bedrift-kunde",
    note: "Løst 2026-06-22: kunde-form har nå privat/bedrift-toggle med separate first_name/last_name-felt for privat. Commit e5542a2.",
  },
  {
    id: "ab52dfc8-1262-4250-b8e7-3887e29b9722",
    issue: "#15 Kunder kontaktperson — selvrapportert OK",
    note: "Lukket 2026-06-22: Erik bekreftet selv at info vises ved klikk på navn. Ingen kode-endring nødvendig.",
  },
];

let ok = 0;
let fail = 0;

for (const r of RESOLUTIONS) {
  const { data, error } = await supabase
    .from("issue_reports")
    .update({
      status: "lukket",
      admin_notes: r.note,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", r.id)
    .select("id, title, status")
    .single();
  if (error) {
    console.log(`  FEIL ${r.id} (${r.issue}): ${error.message}`);
    fail++;
    continue;
  }
  if (!data) {
    console.log(`  IKKE FUNNET ${r.id} (${r.issue})`);
    fail++;
    continue;
  }
  console.log(`  ✓ ${r.issue} — ${data.title}`);
  ok++;
}

console.log(`\n${ok} løst, ${fail} feilet.`);
process.exit(fail === 0 ? 0 : 1);
