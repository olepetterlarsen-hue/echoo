#!/usr/bin/env node
// Kjører en SQL-migration mot Supabase prod via Management API.
//
// Bruk:
//   node scripts/run-migration.mjs supabase/migrations/067_xyz.sql
//
// Krever SUPABASE_ACCESS_TOKEN + NEXT_PUBLIC_SUPABASE_URL i .env.local.
// Cloudflare WAF blokkerer requests uten User-Agent — sett en bevisst.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (!m) continue;
    const [, k, v] = m;
    if (!process.env[k]) process.env[k] = v.replace(/^['"]|['"]$/g, "");
  }
}

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/run-migration.mjs <path-to-sql>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!url || !token) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}
const ref = url.replace("https://", "").replace(".supabase.co", "").replace(/\/$/, "");

const sql = readFileSync(resolve(path), "utf8");
console.log(`Kjører ${path} (${sql.length} chars) mot ${ref}...`);

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Echoo-Migration-Runner/1.0",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: sql }),
  },
);

const body = await res.text();
console.log(`Status: ${res.status}`);
console.log(`Body: ${body || "(empty)"}`);
process.exit(res.ok ? 0 : 1);
