"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
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
  const orgId = await getCurrentOrgId(supabase);
  await guardOrgWritable(supabase, orgId);
  return { supabase, orgId };
}

/* ============================================================
   project_stages CRUD
   ============================================================ */

export async function createStage(input: {
  name: string;
  color: string;
  order_index?: number;
}): Promise<{ id?: string; error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const name = input.name.trim();
  if (!name) return { error: "Navn er påkrevd." };

  let nextOrder = input.order_index;
  if (nextOrder === undefined) {
    const { data: max } = await ctx.supabase
      .from("project_stages")
      .select("order_index")
      .eq("organization_id", ctx.orgId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    nextOrder = (max?.order_index ?? 0) + 1;
  }

  const { data, error } = await ctx.supabase
    .from("project_stages")
    .insert({
      organization_id: ctx.orgId,
      name,
      color: input.color || "#9A9AA4",
      order_index: nextOrder,
      is_active: true,
    } as never)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin/prosjekt-oppsett");
  revalidatePath("/kanban");
  return { id: data.id };
}

export async function updateStage(input: {
  id: string;
  name?: string;
  color?: string;
  order_index?: number;
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
  if (input.color !== undefined) patch.color = input.color;
  if (input.order_index !== undefined) patch.order_index = input.order_index;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  const { error } = await ctx.supabase
    .from("project_stages")
    .update(patch as never)
    .eq("id", input.id)
    .eq("organization_id", ctx.orgId);
  if (error) return { error: error.message };
  revalidatePath("/admin/prosjekt-oppsett");
  revalidatePath("/kanban");
  return {};
}

export async function deleteStage(input: {
  id: string;
}): Promise<{ error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { error } = await ctx.supabase
    .from("project_stages")
    .delete()
    .eq("id", input.id)
    .eq("organization_id", ctx.orgId);
  if (error) return { error: error.message };
  revalidatePath("/admin/prosjekt-oppsett");
  revalidatePath("/kanban");
  return {};
}

export async function reorderStage(input: {
  id: string;
  direction: "up" | "down";
}): Promise<{ error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { data: all } = await ctx.supabase
    .from("project_stages")
    .select("id, order_index")
    .eq("organization_id", ctx.orgId)
    .order("order_index", { ascending: true });
  if (!all) return { error: "Klarte ikke laste stadier." };
  const idx = all.findIndex((s) => s.id === input.id);
  if (idx === -1) return { error: "Fant ikke stadium." };
  const swapIdx = input.direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return {};
  const a = all[idx];
  const b = all[swapIdx];
  await ctx.supabase
    .from("project_stages")
    .update({ order_index: b.order_index } as never)
    .eq("id", a.id);
  await ctx.supabase
    .from("project_stages")
    .update({ order_index: a.order_index } as never)
    .eq("id", b.id);
  revalidatePath("/admin/prosjekt-oppsett");
  revalidatePath("/kanban");
  return {};
}
