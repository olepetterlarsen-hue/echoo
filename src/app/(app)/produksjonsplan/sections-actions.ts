"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { getServerT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("auth_invalid") };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return { error: t("adm_user_err_missing_admin") };
  return { supabase, t };
}

export async function createSection(name: string) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return { error: ctx.t("required") };

  const { data: maxRow } = await ctx.supabase
    .from("gantt_sections")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? 0) + 10;

  let orgId: string;
  try {
    orgId = await getCurrentOrgId(ctx.supabase);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { data, error } = await ctx.supabase
    .from("gantt_sections")
    .insert({ organization_id: orgId, name: trimmed, sort_order: nextOrder })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/produksjonsplan");
  return { ok: true, id: data.id };
}

export async function renameSection(id: string, name: string) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return { error: ctx.t("required") };
  const { error } = await ctx.supabase
    .from("gantt_sections")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/produksjonsplan");
  return { ok: true };
}

export async function deleteSection(id: string) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const { error } = await ctx.supabase
    .from("gantt_sections")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/produksjonsplan");
  return { ok: true };
}

export async function moveSection(id: string, direction: "up" | "down") {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const { data: all } = await ctx.supabase
    .from("gantt_sections")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });
  if (!all) return { error: "load failed" };
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return { error: "not found" };
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return { ok: true };
  const a = all[idx];
  const b = all[swapIdx];
  // Swap sort_order
  await ctx.supabase
    .from("gantt_sections")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);
  await ctx.supabase
    .from("gantt_sections")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);
  revalidatePath("/produksjonsplan");
  return { ok: true };
}

export async function assignGroupToSection(
  groupId: string,
  sectionId: string | null,
) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;

  // Velg nytt sort_order: største i seksjonen + 10
  let maxQuery = ctx.supabase
    .from("groups")
    .select("gantt_sort_order")
    .order("gantt_sort_order", { ascending: false })
    .limit(1);
  if (sectionId === null) {
    maxQuery = maxQuery.is("gantt_section_id", null);
  } else {
    maxQuery = maxQuery.eq("gantt_section_id", sectionId);
  }
  const { data: maxRow } = await maxQuery.maybeSingle();
  const nextOrder = (maxRow?.gantt_sort_order ?? 0) + 10;

  const { error } = await ctx.supabase
    .from("groups")
    .update({ gantt_section_id: sectionId, gantt_sort_order: nextOrder })
    .eq("id", groupId);
  if (error) return { error: error.message };
  revalidatePath("/produksjonsplan");
  return { ok: true };
}

export async function moveGroup(
  groupId: string,
  direction: "up" | "down",
) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;

  // Hent gruppen for å finne dens seksjon
  const { data: target } = await ctx.supabase
    .from("groups")
    .select("id, gantt_section_id, gantt_sort_order")
    .eq("id", groupId)
    .single();
  if (!target) return { error: "not found" };

  // Hent alle grupper i samme seksjon, sortert
  const sectionFilter = target.gantt_section_id;
  let query = ctx.supabase
    .from("groups")
    .select("id, gantt_sort_order")
    .order("gantt_sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (sectionFilter === null) {
    query = query.is("gantt_section_id", null);
  } else {
    query = query.eq("gantt_section_id", sectionFilter);
  }
  const { data: peers } = await query;
  if (!peers) return { error: "load failed" };
  const idx = peers.findIndex((g) => g.id === groupId);
  if (idx === -1) return { error: "not in peers" };
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= peers.length) return { ok: true };
  const a = peers[idx];
  const b = peers[swapIdx];
  await ctx.supabase
    .from("groups")
    .update({ gantt_sort_order: b.gantt_sort_order })
    .eq("id", a.id);
  await ctx.supabase
    .from("groups")
    .update({ gantt_sort_order: a.gantt_sort_order })
    .eq("id", b.id);
  revalidatePath("/produksjonsplan");
  return { ok: true };
}
