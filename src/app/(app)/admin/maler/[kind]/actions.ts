"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { guardOrgWritable } from "@/lib/billing";
import { getServerT } from "@/lib/i18n/server";
import type { DocumentKind } from "@/lib/types/database";
import type { TemplateDef } from "@/lib/document-templates/types";

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

export async function saveTemplate(input: {
  kind: DocumentKind;
  definition: TemplateDef;
}): Promise<{ error?: string }> {
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
  const { error } = await supabase
    .from("document_templates")
    .upsert(
      {
        organization_id: orgId,
        kind: input.kind,
        definition: input.definition as unknown as Record<string, unknown>,
        updated_by: userId,
      },
      { onConflict: "organization_id,kind" },
    );
  if (error) return { error: error.message };

  revalidatePath(`/admin/maler/${input.kind}`);
  revalidatePath("/admin/maler");
  revalidatePath(`/prosjekter`, "layout");
  return {};
}

export async function restoreDefault(input: {
  kind: DocumentKind;
}): Promise<{ error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { supabase } = ctx;
  const { error } = await supabase
    .from("document_templates")
    .delete()
    .eq("kind", input.kind);
  if (error) return { error: error.message };
  revalidatePath(`/admin/maler/${input.kind}`);
  revalidatePath("/admin/maler");
  return {};
}

export async function toggleTemplateHidden(input: {
  kind: DocumentKind;
  hidden: boolean;
}): Promise<{ error?: string }> {
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

  // Sjekk om rad eksisterer; oppretter hvis ikke
  const { data: existing } = await supabase
    .from("document_templates")
    .select("kind")
    .eq("kind", input.kind)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("document_templates")
      .update({ is_hidden: input.hidden, updated_by: userId })
      .eq("kind", input.kind);
    if (error) return { error: error.message };
  } else {
    // Trenger en definisjon for å lage raden — bruk en tom placeholder
    // (selve definisjonen leses fra TS-default når den ikke er overskrevet)
    const { error } = await supabase.from("document_templates").insert({
      organization_id: orgId,
      kind: input.kind,
      definition: {},
      is_hidden: input.hidden,
      updated_by: userId,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/maler");
  revalidatePath("/prosjekter", "layout");
  revalidatePath("/skjemaer");
  return {};
}
