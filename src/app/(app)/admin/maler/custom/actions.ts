"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { guardOrgWritable } from "@/lib/billing";
import { getServerT } from "@/lib/i18n/server";
import { captureException } from "@/lib/observability";
import type { CustomTemplate } from "@/lib/types/database";
import type { TemplateDef, SectionDef } from "@/lib/document-templates/types";

async function requireAdmin() {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error(t("adm_tpl_err_not_logged_in"));
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error(t("adm_tpl_err_missing_admin"));
  return { supabase, userId: user.id };
}

export async function createCustomTemplate(input: {
  name: string;
  subtitle?: string;
  description?: string;
  sections?: SectionDef[];
  aiGenerated?: boolean;
}): Promise<{ template?: CustomTemplate; error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { supabase, userId } = ctx;
  let orgId: string;
  try {
    orgId = await getCurrentOrgId(supabase);
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { data, error } = await supabase
    .from("custom_templates")
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      subtitle: input.subtitle?.trim() || null,
      description: input.description?.trim() || null,
      definition: { sections: input.sections ?? [] },
      ai_generated: input.aiGenerated ?? false,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/maler");
  revalidatePath("/skjemaer");
  return { template: data as CustomTemplate };
}

export async function updateCustomTemplate(input: {
  id: string;
  name?: string;
  subtitle?: string | null;
  description?: string | null;
  sections?: SectionDef[];
  is_hidden?: boolean;
}): Promise<{ template?: CustomTemplate; error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { supabase } = ctx;

  const patch: {
    name?: string;
    subtitle?: string | null;
    description?: string | null;
    definition?: Record<string, unknown>;
    is_hidden?: boolean;
  } = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.subtitle !== undefined)
    patch.subtitle = input.subtitle?.trim() || null;
  if (input.description !== undefined)
    patch.description = input.description?.trim() || null;
  if (input.sections !== undefined)
    patch.definition = { sections: input.sections };
  if (input.is_hidden !== undefined) patch.is_hidden = input.is_hidden;

  const { data, error } = await supabase
    .from("custom_templates")
    .update(patch)
    .eq("id", input.id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/maler");
  revalidatePath(`/admin/maler/custom/${input.id}`);
  revalidatePath("/skjemaer");
  return { template: data as CustomTemplate };
}

export async function deleteCustomTemplate(input: {
  id: string;
}): Promise<{ error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { supabase } = ctx;
  const { t } = await getServerT();

  // Sjekk om noen dokumenter bruker malen
  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("kind", "custom")
    .filter("data->>_template_id", "eq", input.id);

  if ((count ?? 0) > 0) {
    return {
      error: t("adm_tpl_cust_in_use").replace("{count}", String(count)),
    };
  }

  const { error } = await supabase
    .from("custom_templates")
    .delete()
    .eq("id", input.id);
  if (error) return { error: error.message };

  revalidatePath("/admin/maler");
  return {};
}

// AI-generering av sjekkliste/mal med Claude API
export async function generateTemplateWithAi(input: {
  description: string;
  preferLanguage?: "no" | "en";
}): Promise<{ template?: Partial<TemplateDef>; error?: string }> {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { t } = await getServerT();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { error: t("adm_tpl_cust_ai_no_key") };
  }

  const lang = input.preferLanguage ?? "no";
  const langName = lang === "no" ? "norsk" : "engelsk";

  const systemPrompt = `Du er en ekspert på HMS, elektrosikkerhet og kvalitetssystemer i norsk elektrobransje. Du lager strukturerte sjekklister og dokumentmaler i JSON-format.

Brukeren beskriver hva slags sjekkliste eller skjema de trenger. Du svarer KUN med et gyldig JSON-objekt som matcher følgende TypeScript-type:

\`\`\`
interface Output {
  title: string;          // Tittel på dokumentet
  subtitle: string;       // Kort undertittel (én linje)
  description?: string;   // Valgfri kort beskrivelse av når dette skjemaet skal brukes
  sections: Array<{
    title: string;
    description?: string;
    fields: Array<{
      key: string;        // unik snake_case-ID, f.eks. "kontroll_dato"
      label: string;      // spørsmålstekst som brukeren ser
      kind: "text" | "textarea" | "number" | "date" | "select" | "radio" | "yes_no" | "checkbox" | "checkmark_group" | "yna_group";
      required?: boolean;
      hint?: string;
      options?: string[];                              // for select / radio / checkmark_group
      items?: Array<{ key: string; label: string }>;   // for yna_group (Ja/Nei/Uakt-tabeller)
    }>;
  }>;
}
\`\`\`

REGLER:
- ALL tekst (title, subtitle, label, hint, options, etc.) skal være på ${langName}.
- Bruk \`yna_group\` for sjekkpunkter med flere ja/nei-spørsmål.
- Bruk \`yes_no\` for enkeltspørsmål med JA/NEI-svar.
- Bruk \`textarea\` for fritekstsvar.
- Bruk \`select\` eller \`radio\` for valg fra liste.
- Bruk \`checkmark_group\` for flere avkrysninger (f.eks. "Hvilket verneutstyr brukes?").
- Inkluder Info-seksjon først med dato, site ID og lignende basisfelt.
- Lag fornuftig struktur med 2-6 seksjoner og 3-15 felter totalt.
- key-verdier skal være korte snake_case-strenger uten mellomrom eller spesialtegn.
- IKKE inkluder forklaringer eller markdown — bare ren JSON.`;

  const client = new Anthropic({ apiKey });
  try {
    const message = await client.messages.create({
      // Haiku 4.5 — billig og rask, god nok for mal-generering
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Lag en sjekkliste/skjema basert på denne beskrivelsen:\n\n"${input.description}"\n\nSvar med kun JSON-objektet.`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      captureException(new Error("AI response missing text block"), {
        context: "ai-template-generation",
        content: JSON.stringify(message.content).slice(0, 500),
      });
      return { error: t("adm_tpl_cust_ai_no_text") };
    }
    let raw = textBlock.text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    }

    let parsed: {
      title: string;
      subtitle: string;
      description?: string;
      sections: SectionDef[];
    };
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      captureException(parseErr, {
        context: "ai-template-json-parse",
        raw: raw.slice(0, 500),
      });
      const msg = parseErr instanceof Error ? parseErr.message : "ukjent";
      return { error: t("adm_tpl_cust_ai_bad_json").replace("{msg}", msg) };
    }

    if (!parsed.title || !Array.isArray(parsed.sections)) {
      captureException(new Error("AI response missing title or sections"), {
        context: "ai-template-format",
        parsed: JSON.stringify(parsed).slice(0, 500),
      });
      return { error: t("adm_tpl_cust_ai_bad_format") };
    }

    return {
      template: {
        title: parsed.title,
        subtitle: parsed.subtitle ?? "",
        description: parsed.description,
        sections: parsed.sections,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ukjent feil";
    captureException(e, { context: "ai-template-generation-outer" });
    return { error: t("adm_tpl_cust_ai_failed").replace("{msg}", msg) };
  }
}
