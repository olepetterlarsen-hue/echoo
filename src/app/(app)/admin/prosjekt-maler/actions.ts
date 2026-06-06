"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import type { ProjectPhase } from "@/lib/types/database";

interface UpsertInput {
  id?: string;
  name: string;
  description?: string;
  default_category_id?: string | null;
  default_phase?: ProjectPhase | null;
  default_installation_type?: string | null;
  default_description?: string | null;
  default_assigned_to?: string | null;
  default_stage_id?: string | null;
  order_index?: number;
  is_active?: boolean;
}

export async function upsertTemplate(
  input: UpsertInput,
): Promise<{ id?: string; error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("adm_ptpl_err_not_logged_in") };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return { error: t("adm_ptpl_err_requires_admin") };

  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    default_category_id: input.default_category_id || null,
    default_phase: input.default_phase || null,
    default_installation_type: input.default_installation_type || null,
    default_description: input.default_description?.trim() || null,
    default_assigned_to: input.default_assigned_to || null,
    default_stage_id: input.default_stage_id || null,
    order_index: input.order_index ?? 0,
    is_active: input.is_active ?? true,
  };

  if (input.id) {
    const { error } = await supabase
      .from("project_templates")
      .update(payload)
      .eq("id", input.id);
    if (error) return { error: error.message };
    revalidatePath("/admin/prosjekt-maler");
    return { id: input.id };
  }
  const { data, error } = await supabase
    .from("project_templates")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin/prosjekt-maler");
  return { id: data.id };
}

export async function deleteTemplate(input: {
  id: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_templates")
    .delete()
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/admin/prosjekt-maler");
  return {};
}
