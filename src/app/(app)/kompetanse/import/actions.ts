"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { guardOrgWritable } from "@/lib/billing";
import { guardedMessage, safeParseJson } from "@/lib/ai/assistant";

const SYSTEM_PROMPT = `Du er en ekspert på norske kursbevis og sertifikater for elektrobransjen. Du leser et kursbevis (PDF) og ekstraherer hovedfeltene som JSON.

Du svarer ALLTID med rent JSON-objekt — ingen markdown, ingen forklaring:
{
  "course_name": "Kursets navn (f.eks. \\"FSE-kurs lavspenning\\", \\"Førstehjelp\\", \\"Arbeid i høyden\\")",
  "person_name": "Personens fulle navn slik det står på beviset",
  "issuer": "Utsteder/kursarrangør (f.eks. \\"Elsikkerhet Norge\\", \\"DSB\\", \\"Norsk Elektroteknisk Komité\\")",
  "issued_date": "YYYY-MM-DD utstedt-dato, eller tom streng",
  "expires_date": "YYYY-MM-DD utløpsdato, eller tom streng hvis ikke nevnt",
  "confidence": 0.0-1.0
}

Vanlige norske elektrobransje-kurs:
- FSE-kurs (lavspenning, høyspenning, instruerte personer)
- Førstehjelp og hjerte-lunge-redning
- Arbeid i høyden / fallsikring
- Stiger og stillas
- Varme arbeider
- NEK 405 sakkyndig kontroll
- Maskinist / kranfører / personløfter
- Asbest-håndtering
- Internkontroll-kurs

Hvis dokumentet ikke er et kursbevis: sett course_name til "Ikke et kursbevis" og confidence til 0.`;

interface CertExtraction {
  course_name: string;
  person_name: string;
  issuer: string;
  issued_date: string;
  expires_date: string;
  confidence: number;
}

export async function certImportPath(args: {
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
  return { path: `${orgId}/cert-import-${args.session_id}/${safe}` };
}

export async function classifyCertPdf(args: {
  path: string;
}): Promise<{ extracted?: CertExtraction; error?: string }> {
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
    return { error: "ANTHROPIC_API_KEY mangler." };
  }

  const { data, error } = await supabase.storage
    .from("org-imports")
    .download(args.path);
  if (error || !data) {
    return { error: error?.message ?? "Klarte ikke hente PDF." };
  }
  const buf = Buffer.from(await data.arrayBuffer());
  const base64 = buf.toString("base64");

  try {
    const msg = await guardedMessage({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
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
              text: "Ekstraher feltene. Svar med ren JSON.",
            },
          ],
        },
      ],
    });
    const text = msg.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return { error: "Tomt AI-svar." };
    }
    const parsed = safeParseJson<CertExtraction>(text.text);
    if (!parsed) return { error: "Klarte ikke parse AI-svar." };
    return { extracted: parsed };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export interface CommitCertItem {
  source_path: string;            // path i org-imports
  filename: string;               // original filename
  profile_id: string;             // matchet bruker
  required_course_id: string | null;
  name: string;                   // kursnavn
  issuer: string | null;
  issued_date: string | null;
  expires_date: string | null;
}

export async function commitCertImports(args: {
  items: CommitCertItem[];
}): Promise<{
  inserted?: number;
  errors?: Array<{ filename: string; error: string }>;
}> {
  const supabase = await createClient();
  let orgId: string;
  try {
    ({ orgId } = await getOrgAndUser(supabase));
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { errors: [{ filename: "-", error: (e as Error).message }] };
  }

  const errors: Array<{ filename: string; error: string }> = [];
  let inserted = 0;

  for (const it of args.items) {
    if (!it.profile_id) {
      errors.push({
        filename: it.filename,
        error: "Mangler profil-matching.",
      });
      continue;
    }
    if (!it.name.trim()) {
      errors.push({ filename: it.filename, error: "Mangler kursnavn." });
      continue;
    }

    // Last ned fra org-imports
    const { data: blob, error: dlErr } = await supabase.storage
      .from("org-imports")
      .download(it.source_path);
    if (dlErr || !blob) {
      errors.push({
        filename: it.filename,
        error: dlErr?.message ?? "Klarte ikke hente fil.",
      });
      continue;
    }
    const safeName = it.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const targetPath = `${it.profile_id}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("certificates")
      .upload(targetPath, blob, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (upErr) {
      errors.push({ filename: it.filename, error: upErr.message });
      continue;
    }

    const { error: insErr } = await supabase
      .from("certificates")
      .insert({
        organization_id: orgId,
        profile_id: it.profile_id,
        required_course_id: it.required_course_id,
        name: it.name.trim(),
        issuer: it.issuer?.trim() || null,
        issued_date: it.issued_date || null,
        expires_date: it.expires_date || null,
        file_path: targetPath,
        ai_generated: true,
      } as never);
    if (insErr) {
      // Rull tilbake opplastet kopi for ikke å lage spøkelses-filer
      await supabase.storage.from("certificates").remove([targetPath]);
      errors.push({ filename: it.filename, error: insErr.message });
      continue;
    }

    // Slett kilde i org-imports
    await supabase.storage.from("org-imports").remove([it.source_path]);
    inserted++;
  }

  revalidatePath("/kompetanse");
  revalidatePath("/kompetanse/matrise");
  return { inserted, errors };
}
