// Engangs-script for å laste opp engelske rutiner til Supabase Storage.
// Kjøres med: node scripts/upload-routines.mjs
// Krever .env.local med SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Parse .env.local manuelt
function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  const text = readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

const ROUTINES_FOLDER = "/Users/claude-julianne/Documents/Instrukser/Rutiner engelsk";

// Map fra filnavn (starter med tall) til rutine-nummer
const FILE_PATTERN = /^(\d+)\./;

async function main() {
  console.log("Leser rutiner-mappa…");
  const files = readdirSync(ROUTINES_FOLDER).filter((f) =>
    f.toLowerCase().endsWith(".pdf"),
  );
  console.log(`Fant ${files.length} PDF-filer.`);

  // Hent rutine-IDer fra DB
  const { data: routines, error: fetchErr } = await supabase
    .from("routines")
    .select("id, number, title_en");
  if (fetchErr) {
    console.error("Klarte ikke hente rutiner:", fetchErr);
    process.exit(1);
  }

  const byNumber = new Map(routines.map((r) => [r.number, r]));

  let uploaded = 0;
  let skipped = 0;
  let errored = 0;

  for (const file of files) {
    const m = file.match(FILE_PATTERN);
    if (!m) {
      console.log(`⊘ Hopper over ${file} (mangler nummer i filnavn)`);
      skipped++;
      continue;
    }
    const number = Number(m[1]);
    const routine = byNumber.get(number);
    if (!routine) {
      console.log(`⊘ Ingen rutine med nummer ${number} for fil ${file}`);
      skipped++;
      continue;
    }

    const filePath = path.join(ROUTINES_FOLDER, file);
    const fileBuffer = readFileSync(filePath);
    const storagePath = `${routine.id}/en.pdf`;

    console.log(`↑ ${number}. ${routine.title_en.substring(0, 50)}…`);
    const { error: upErr } = await supabase.storage
      .from("routines")
      .upload(storagePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (upErr) {
      console.error(`  ✗ Opplasting feilet: ${upErr.message}`);
      errored++;
      continue;
    }

    const { error: updErr } = await supabase
      .from("routines")
      .update({ file_path_en: storagePath })
      .eq("id", routine.id);

    if (updErr) {
      console.error(`  ✗ DB-oppdatering feilet: ${updErr.message}`);
      errored++;
      continue;
    }

    console.log(`  ✓ Lastet opp og koblet`);
    uploaded++;
  }

  console.log(`\nFerdig. ${uploaded} lastet opp, ${skipped} hoppet over, ${errored} feilet.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
