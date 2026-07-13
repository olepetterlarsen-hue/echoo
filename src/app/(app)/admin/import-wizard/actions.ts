"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { guardOrgWritable } from "@/lib/billing";
import { guardedMessage } from "@/lib/ai/assistant";

/**
 * AI-guided import wizard.
 *
 * Flyt:
 *   1. Klient ber om signed upload URL → uploadUrl()
 *   2. Klient laster opp PDF direkte til Supabase storage
 *   3. Klient kaller classifyFile() — server henter PDF, sender til Claude
 *      Haiku, får { kind, title, summary, confidence, clarifying_questions }
 *   4. Hvis confidence < 0.7 eller clarifying_questions finnes: vis dem i UI,
 *      brukeren svarer, klient kaller refineClassification() med svarene
 *   5. Brukeren ser review-skjerm og kaller commitImports() med liste over
 *      items + valgte kinds → opprett records
 *
 * Konvensjoner:
 *   - org-imports/{org_id}/{session_id}/{filename}
 *   - committed items endrer ikke source-filen; den ryddes ved sletting
 */

const SYSTEM_PROMPT = `Du er en ekspert på dokumentstyring for norsk elektrobransje.
Du klassifiserer dokumenter for import i Echoo (et kvalitets- og prosjektstyringssystem).

Klassifikasjons-kategorier:
- "rutine":        Standard arbeidsrutine, prosedyre, IK-rutine
- "skjema_mal":    Mal/skjema som skal kunne brukes på prosjekter
                   (risikovurdering, sluttkontroll, SJA, RUH osv.)
- "handbok":       Kapittel eller seksjon fra HMS-håndbok, kvalitetshåndbok
- "stoffkartotek": Datablad (SDS) for kjemikalie/stoff
- "kompetanse":    Kursbevis, sertifikat for person
- "ukjent":        Du klarer ikke avgjøre

Du svarer ALLTID med ren JSON i dette formatet:
{
  "kind": "rutine"|"skjema_mal"|"handbok"|"stoffkartotek"|"kompetanse"|"ukjent",
  "title": "Foreslått tittel — kortest mulig, på norsk",
  "summary": "1-3 setninger på norsk som forklarer innholdet",
  "confidence": 0.0-1.0,
  "clarifying_questions": [   // valgfritt — kun ved lav confidence
    {"id": "q1", "question": "...?", "options": ["..."]}
  ],
  "extracted_fields": {       // valgfritt — feks for stoffkartotek
    "manufacturer": "...",
    "cas_number": "...",
    "expires_date": "YYYY-MM-DD"
  }
}

Bruk lav confidence (< 0.7) og still spørsmål når:
- Det er flere mulige kategorier
- Tittel-en er uklar
- Du mangler kritisk informasjon (f.eks. utløpsdato for sertifikat)`;

interface ClassifyResult {
  kind:
    | "rutine"
    | "skjema_mal"
    | "handbok"
    | "stoffkartotek"
    | "kompetanse"
    | "ukjent";
  title: string;
  summary: string;
  confidence: number;
  clarifying_questions?: Array<{
    id: string;
    question: string;
    options?: string[];
  }>;
  extracted_fields?: Record<string, string>;
}

/**
 * Klient laster opp via Supabase storage; vi trenger ikke å returnere
 * en signed URL, vi forenkler ved å la klienten bruke vanlig auth.
 * Server beregner riktig path og returnerer den.
 */
export async function importPath(args: {
  session_id: string;
  filename: string;
}): Promise<{ path?: string; error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  try {
    ({ orgId } = await getOrgAndUser(supabase));
  } catch (e) {
    return { error: (e as Error).message };
  }
  const safe = args.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${orgId}/${args.session_id}/${safe}`;
  return { path };
}

async function fetchFileAsBase64(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string,
): Promise<{ base64: string; mediaType: string }> {
  const { data, error } = await supabase.storage
    .from("org-imports")
    .download(path);
  if (error || !data) throw new Error(error?.message ?? "kunne ikke hente fil");
  const buf = Buffer.from(await data.arrayBuffer());
  const mediaType = data.type || "application/pdf";
  return { base64: buf.toString("base64"), mediaType };
}

function safeParseJson<T>(raw: string): T | null {
  try {
    let s = raw.trim();
    if (s.startsWith("```")) {
      s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    }
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export async function classifyFile(args: {
  path: string;
  userClarifications?: Array<{ id: string; answer: string }>;
}): Promise<{ result?: ClassifyResult; error?: string }> {
  const supabase = await createClient();
  try {
    const { orgId } = await getOrgAndUser(supabase);
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { error: "ANTHROPIC_API_KEY mangler i miljøet." };
  }

  let base64: string;
  let mediaType: string;
  try {
    ({ base64, mediaType } = await fetchFileAsBase64(supabase, args.path));
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (!mediaType.includes("pdf")) {
    return {
      error: "AI-import støtter foreløpig kun PDF. Konverter filen og prøv igjen.",
    };
  }

  const userMessage = [
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
      text:
        "Klassifiser dokumentet ovenfor. Svar bare med JSON-objektet." +
        (args.userClarifications && args.userClarifications.length > 0
          ? "\n\nBrukerens svar på oppklarende spørsmål:\n" +
            args.userClarifications
              .map((c) => `- ${c.id}: ${c.answer}`)
              .join("\n")
          : ""),
    },
  ];

  try {
    const msg = await guardedMessage({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const text = msg.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return { error: "Tomt svar fra AI." };
    }
    const parsed = safeParseJson<ClassifyResult>(text.text);
    if (!parsed) {
      return { error: "Klarte ikke parse AI-svar som JSON." };
    }
    return { result: parsed };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Commit. Tar en liste over items klart for import:
 *   { path, kind, title, summary, extracted_fields? }
 *
 * For hver kind oppretter vi riktig type record + lar source-filen
 * ligge i org-imports (klienten kan slette etterpå hvis ønskelig).
 */
interface CommitItem {
  path: string;
  kind: ClassifyResult["kind"];
  title: string;
  summary?: string;
  extracted_fields?: Record<string, string>;
}

export async function commitImports(args: {
  items: CommitItem[];
}): Promise<{
  results: Array<{
    path: string;
    ok: boolean;
    error?: string;
    target?: string;
  }>;
  error?: string;
}> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { results: [], error: (e as Error).message };
  }

  const results: Array<{
    path: string;
    ok: boolean;
    error?: string;
    target?: string;
  }> = [];

  for (const item of args.items) {
    if (!item.title.trim()) {
      results.push({ path: item.path, ok: false, error: "Mangler tittel." });
      continue;
    }

    try {
      if (item.kind === "rutine") {
        const { error } = await supabase.from("routines").insert({
          organization_id: orgId,
          title_no: item.title.trim(),
          title_en: item.title.trim(),
          description_no: item.summary ?? null,
          description_en: item.summary ?? null,
          file_path_no: item.path,
          active: true,
        } as never);
        if (error) throw error;
        results.push({ path: item.path, ok: true, target: "rutiner" });
      } else if (item.kind === "skjema_mal") {
        const { error } = await supabase.from("custom_templates").insert({
          organization_id: orgId,
          name: item.title.trim(),
          description: item.summary ?? null,
          definition: { sections: [] },
          ai_generated: true,
          created_by: userId,
        });
        if (error) throw error;
        results.push({
          path: item.path,
          ok: true,
          target: "custom_templates",
        });
      } else if (item.kind === "handbok") {
        // Lagrer som en custom_template med spesiell flagg i description
        const { error } = await supabase.from("custom_templates").insert({
          organization_id: orgId,
          name: `Håndbok: ${item.title.trim()}`,
          description: item.summary ?? null,
          definition: { sections: [], is_handbook: true },
          ai_generated: true,
          created_by: userId,
        });
        if (error) throw error;
        results.push({ path: item.path, ok: true, target: "håndbok" });
      } else if (item.kind === "stoffkartotek") {
        const { error } = await supabase.from("substances").insert({
          organization_id: orgId,
          name: item.title.trim(),
          manufacturer: item.extracted_fields?.manufacturer ?? null,
          cas_number: item.extracted_fields?.cas_number ?? null,
          sds_file_path: item.path, // peker på import-fila
          ghs_pictograms: [],
          active: true,
          created_by: userId,
        } as never);
        if (error) throw error;
        results.push({ path: item.path, ok: true, target: "stoffkartotek" });
      } else if (item.kind === "kompetanse") {
        // Vi vet ikke hvilken profil sertifikatet hører til — admin må selv velge.
        // Setter foreløpig profile_id til brukeren som importerer; admin kan
        // re-assigne i /kompetanse etterpå.
        const { error } = await supabase.from("certificates").insert({
          organization_id: orgId,
          profile_id: userId,
          name: item.title.trim(),
          issuer: item.extracted_fields?.issuer ?? null,
          expires_date: item.extracted_fields?.expires_date ?? null,
          file_path: item.path,
        } as never);
        if (error) throw error;
        results.push({ path: item.path, ok: true, target: "kompetanse" });
      } else {
        // ukjent — hopp over
        results.push({
          path: item.path,
          ok: false,
          error: "Klassifisert som ukjent. Velg type og prøv igjen.",
        });
        continue;
      }
    } catch (e) {
      results.push({
        path: item.path,
        ok: false,
        error: (e as Error).message,
      });
    }
  }

  revalidatePath("/rutiner");
  revalidatePath("/admin/maler");
  revalidatePath("/stoffkartotek");
  revalidatePath("/kompetanse");
  return { results };
}
