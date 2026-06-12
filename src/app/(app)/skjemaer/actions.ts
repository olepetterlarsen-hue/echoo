"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import type { DocumentKind } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

const STANDALONE_ALLOWED: DocumentKind[] = [
  "sja",
  "ruh",
  "startup_checklist",
  "stikkprovekontroll",
  "custom",
];

export async function createStandaloneDocument(input: {
  kind: DocumentKind;
  customTemplateId?: string;
}): Promise<{ documentId?: string; error?: string }> {
  const { t } = await getServerT();
  if (!STANDALONE_ALLOWED.includes(input.kind)) {
    return { error: t("form_err_not_standalone") };
  }
  if (input.kind === "custom" && !input.customTemplateId) {
    return { error: t("form_err_custom_needs_template") };
  }
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
  } catch {
    return { error: t("form_err_not_logged_in") };
  }

  const initialData: Record<string, unknown> = {};
  if (input.kind === "custom" && input.customTemplateId) {
    initialData._template_id = input.customTemplateId;
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      organization_id: orgId,
      project_id: null,
      kind: input.kind,
      version: 1,
      status: "utkast",
      data: initialData,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/skjemaer");
  return { documentId: data.id };
}
