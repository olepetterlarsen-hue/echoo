"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { guardOrgWritable } from "@/lib/billing";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Ikke innlogget");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error("Krever admin");
  const { orgId, userId } = await getOrgAndUser(supabase);
  await guardOrgWritable(supabase, orgId);
  return { supabase, orgId, userId };
}

export async function createRequiredCourse(input: {
  name: string;
  description?: string;
  category?: string;
  validity_months?: number | null;
}): Promise<{ id?: string; error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!input.name.trim()) return { error: "Navn er påkrevd." };

  const { data: max } = await ctx.supabase
    .from("required_courses")
    .select("order_index")
    .eq("organization_id", ctx.orgId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (max?.order_index ?? 0) + 1;

  const { data, error } = await ctx.supabase
    .from("required_courses")
    .insert({
      organization_id: ctx.orgId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      validity_months: input.validity_months ?? null,
      order_index: nextOrder,
      is_active: true,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/kompetanse/kurs-krav");
  revalidatePath("/kompetanse/matrise");
  return { id: data.id };
}

export async function updateRequiredCourse(input: {
  id: string;
  name?: string;
  description?: string | null;
  category?: string | null;
  validity_months?: number | null;
  is_active?: boolean;
}): Promise<{ error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined)
    patch.description = input.description?.trim() || null;
  if (input.category !== undefined)
    patch.category = input.category?.trim() || null;
  if (input.validity_months !== undefined)
    patch.validity_months = input.validity_months;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  const { error } = await ctx.supabase
    .from("required_courses")
    .update(patch as never)
    .eq("id", input.id)
    .eq("organization_id", ctx.orgId);
  if (error) return { error: error.message };
  revalidatePath("/kompetanse/kurs-krav");
  revalidatePath("/kompetanse/matrise");
  return {};
}

export async function deleteRequiredCourse(input: {
  id: string;
}): Promise<{ error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { error } = await ctx.supabase
    .from("required_courses")
    .delete()
    .eq("id", input.id)
    .eq("organization_id", ctx.orgId);
  if (error) return { error: error.message };
  revalidatePath("/kompetanse/kurs-krav");
  revalidatePath("/kompetanse/matrise");
  return {};
}
