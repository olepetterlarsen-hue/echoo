"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { guardOrgWritable } from "@/lib/billing";
import { getServerT } from "@/lib/i18n/server";
import type { CategoryFieldSchema } from "@/lib/types/database";

interface UpsertInput {
  id?: string;
  slug: string;
  name: string;
  description?: string;
  order_index?: number;
  is_active?: boolean;
  field_schema: CategoryFieldSchema;
}

export async function upsertCategory(
  input: UpsertInput,
): Promise<{ id?: string; error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("adm_cat_err_not_logged_in") };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return { error: t("adm_cat_err_requires_admin") };

  let orgId: string;
  try {
    orgId = await getCurrentOrgId(supabase);
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const payload = {
    slug: input.slug.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    order_index: input.order_index ?? 0,
    is_active: input.is_active ?? true,
    field_schema: input.field_schema,
  };

  if (input.id) {
    const { error } = await supabase
      .from("project_categories")
      .update(payload)
      .eq("id", input.id)
      .eq("organization_id", orgId);
    if (error) return { error: error.message };
    revalidatePath("/admin/kategorier");
    return { id: input.id };
  }
  const { data, error } = await supabase
    .from("project_categories")
    .insert({ ...payload, organization_id: orgId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin/kategorier");
  return { id: data.id };
}

export async function deleteCategory(input: {
  id: string;
}): Promise<{ error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("adm_cat_err_not_logged_in") };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return { error: t("adm_cat_err_requires_admin") };

  let orgId: string;
  try {
    orgId = await getCurrentOrgId(supabase);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await supabase
    .from("project_categories")
    .delete()
    .eq("id", input.id)
    .eq("organization_id", orgId);
  if (error) return { error: error.message };
  revalidatePath("/admin/kategorier");
  return {};
}
