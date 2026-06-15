"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { getServerT } from "@/lib/i18n/server";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

export async function createTaskType(input: {
  label_no: string;
  label_en?: string;
  order_index?: number;
}): Promise<{ id?: string; error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  let orgId: string;
  try {
    ({ orgId } = await getOrgAndUser(supabase));
  } catch (e) {
    return { error: (e as Error).message || t("task_err_not_logged_in") };
  }

  const label_no = input.label_no.trim();
  if (!label_no) return { error: "Navn er påkrevd." };
  const slug = slugify(label_no);
  if (!slug) return { error: "Kunne ikke generere slug fra navn." };

  // Sjekk for slug-kollisjon innen org
  const { data: existing } = await supabase
    .from("task_types")
    .select("id")
    .eq("slug", slug)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (existing) {
    return { error: "En type med denne slug-en finnes allerede." };
  }

  const { data, error } = await supabase
    .from("task_types")
    .insert({
      organization_id: orgId,
      slug,
      label_no,
      label_en: input.label_en?.trim() || label_no,
      order_index: input.order_index ?? 100,
      is_active: true,
    } as never)
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/oppgaver/typer");
  revalidatePath("/oppgaver");
  return { id: data.id };
}

export async function updateTaskType(input: {
  id: string;
  label_no?: string;
  label_en?: string;
  order_index?: number;
  is_active?: boolean;
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  const patch: {
    label_no?: string;
    label_en?: string;
    order_index?: number;
    is_active?: boolean;
  } = {};
  if (input.label_no !== undefined) patch.label_no = input.label_no.trim();
  if (input.label_en !== undefined)
    patch.label_en = input.label_en.trim() || (patch.label_no ?? "");
  if (input.order_index !== undefined) patch.order_index = input.order_index;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  const { error } = await supabase
    .from("task_types")
    .update(patch as never)
    .eq("id", input.id);
  if (error) return { error: error.message };

  revalidatePath("/oppgaver/typer");
  revalidatePath("/oppgaver");
  return {};
}

export async function deleteTaskType(input: {
  id: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Hent slug for å nullstille tasks som peker på den
  const { data: taskType } = await supabase
    .from("task_types")
    .select("slug")
    .eq("id", input.id)
    .single();
  if (!taskType) return { error: "Fant ikke oppgavetypen." };

  // Nullstill referansene før sletting
  await supabase
    .from("tasks")
    .update({ task_type_slug: null } as never)
    .eq("task_type_slug", taskType.slug);

  const { error } = await supabase
    .from("task_types")
    .delete()
    .eq("id", input.id);
  if (error) return { error: error.message };

  revalidatePath("/oppgaver/typer");
  revalidatePath("/oppgaver");
  return {};
}
