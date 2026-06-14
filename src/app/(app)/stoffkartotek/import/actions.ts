"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { guardOrgWritable } from "@/lib/billing";
import { safeParseJson } from "@/lib/ai/assistant";
import type { GhsCode } from "@/lib/ghs-pictograms";

/**
 * Stoffkartotek bulk-import.
 *
 * To moduser:
 *  - Liste: brukeren limer inn CSV/TSV-data, parser klient-side,
 *    sender en flat liste hit for bulk insert.
 *  - SDS-PDF: klient laster opp PDFene direkte til substance-sds-bucketen.
 *    For hver fil kaller klienten classifySdsPdf som returnerer
 *    AI-ekstrahert metadata. Etter review committer brukeren alt i én
 *    insert.
 */

export interface SubstanceRow {
  name: string;
  manufacturer?: string;
  cas_number?: string;
  usage_area?: string;
  storage_location?: string;
  ghs_pictograms?: GhsCode[];
  hazard_statements?: string;
  precautionary_measures?: string;
  sds_file_path?: string;
  sds_revision_date?: string;
  quantity_estimate?: string;
  notes?: string;
}

export async function commitSubstanceList(input: {
  rows: SubstanceRow[];
}): Promise<{
  inserted?: number;
  errors?: Array<{ row: number; error: string }>;
}> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { errors: [{ row: -1, error: (e as Error).message }] };
  }

  const cleaned = input.rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.name?.trim());

  if (cleaned.length === 0) {
    return { errors: [{ row: -1, error: "Ingen rader med navn å importere." }] };
  }

  const payload = cleaned.map(({ r }) => ({
    organization_id: orgId,
    created_by: userId,
    name: r.name.trim(),
    manufacturer: r.manufacturer?.trim() || null,
    cas_number: r.cas_number?.trim() || null,
    usage_area: r.usage_area?.trim() || null,
    storage_location: r.storage_location?.trim() || null,
    ghs_pictograms: r.ghs_pictograms ?? [],
    hazard_statements: r.hazard_statements?.trim() || null,
    precautionary_measures: r.precautionary_measures?.trim() || null,
    sds_file_path: r.sds_file_path || null,
    sds_revision_date: r.sds_revision_date || null,
    quantity_estimate: r.quantity_estimate?.trim() || null,
    notes: r.notes?.trim() || null,
    active: true,
  }));

  // Bulk insert med rapportering per rad
  const errors: Array<{ row: number; error: string }> = [];
  let inserted = 0;
  // Sett inn i batcher på 50 for å unngå PostgREST-grenser
  const BATCH = 50;
  for (let i = 0; i < payload.length; i += BATCH) {
    const batch = payload.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from("substances")
      .insert(batch as never)
      .select("id");
    if (error) {
      errors.push({ row: i, error: error.message });
    } else {
      inserted += data?.length ?? 0;
    }
  }

  revalidatePath("/stoffkartotek");
  return { inserted, errors };
}

/* ============================================================
   SDS-PDF AI-ekstraksjon
   ============================================================ */

const SDS_SYSTEM_PROMPT = `Du er en ekspert på sikkerhetsdatablad (SDS) etter REACH/CLP-forordningen, brukt i norsk elektro- og byggebransje.

Du leser et SDS-dokument og ekstraherer hovedfeltene som JSON. Du svarer ALLTID med ren JSON i dette formatet — ingen markdown, ingen forklaring:

{
  "name": "Handelsnavn på produktet (seksjon 1.1)",
  "manufacturer": "Produsent / leverandør (seksjon 1.3)",
  "cas_number": "CAS-nummer for hovedingrediens (seksjon 3) — eller tom streng hvis blanding uten enkelt CAS",
  "ghs_pictograms": ["GHS02", "GHS07", …],  // koder GHS01-GHS09 fra seksjon 2.2
  "hazard_statements": "H-setninger (Hazard statements) — kommaseparert, f.eks. \\"H225: Meget brannfarlig væske og damp, H319: Gir alvorlig øyeirritasjon\\"",
  "precautionary_measures": "P-setninger (Precautionary statements) — kommaseparert",
  "sds_revision_date": "YYYY-MM-DD revisjonsdato fra seksjon 16, eller tom streng",
  "usage_area": "Kort beskrivelse av bruksområde (seksjon 1.2), 1-2 setninger",
  "confidence": 0.0-1.0
}

GHS-piktogrammer som koder:
- GHS01 Eksplosiv  |  GHS02 Brannfarlig  |  GHS03 Oksiderende
- GHS04 Gass under trykk  |  GHS05 Etsende  |  GHS06 Akutt giftig
- GHS07 Helsefare (irritasjon)  |  GHS08 Helsefare (kreftrisk, mutagen, reproduksjonsrisk)
- GHS09 Miljøfare

Hvis dokumentet ikke er et SDS — sett name til "Ikke et SDS" og confidence til 0.`;

const GHS_CODES_VALID: GhsCode[] = [
  "GHS01", "GHS02", "GHS03", "GHS04", "GHS05",
  "GHS06", "GHS07", "GHS08", "GHS09",
];

interface SdsExtraction {
  name: string;
  manufacturer: string;
  cas_number: string;
  ghs_pictograms: GhsCode[];
  hazard_statements: string;
  precautionary_measures: string;
  sds_revision_date: string;
  usage_area: string;
  confidence: number;
}

export async function classifySdsPdf(args: {
  path: string;
}): Promise<{ extracted?: SdsExtraction; error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  try {
    ({ orgId } = await getOrgAndUser(supabase));
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-anthropic-key") {
    return { error: "ANTHROPIC_API_KEY mangler — AI-ekstraksjon utilgjengelig." };
  }

  // Hent fila fra substance-sds-bucketen
  const { data, error } = await supabase.storage
    .from("substance-sds")
    .download(args.path);
  if (error || !data) {
    return { error: error?.message ?? "Klarte ikke hente PDF." };
  }
  const buf = Buffer.from(await data.arrayBuffer());
  const base64 = buf.toString("base64");

  const client = new Anthropic({ apiKey });
  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SDS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document" as const,
              source: {
                type: "base64" as const,
                media_type: "application/pdf" as const,
                data: base64,
              },
            },
            {
              type: "text" as const,
              text: "Ekstraher SDS-feltene fra dokumentet. Svar med ren JSON.",
            },
          ],
        },
      ],
    });
    const text = msg.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return { error: "Tomt AI-svar." };
    }
    const parsed = safeParseJson<SdsExtraction>(text.text);
    if (!parsed) return { error: "Klarte ikke parse AI-svar." };

    // Sanity: filtrer ut ugyldige GHS-koder
    parsed.ghs_pictograms = (parsed.ghs_pictograms ?? []).filter((c) =>
      GHS_CODES_VALID.includes(c),
    );
    return { extracted: parsed };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function sdsUploadPath(args: {
  filename: string;
}): Promise<{ path?: string; error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  try {
    ({ orgId } = await getOrgAndUser(supabase));
  } catch (e) {
    return { error: (e as Error).message };
  }
  // Path-konvensjon: {org_id}/{timestamp}-{rand}.{ext}
  const safe = args.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${orgId}/${Date.now()}-${rand}-${safe}`;
  return { path };
}
