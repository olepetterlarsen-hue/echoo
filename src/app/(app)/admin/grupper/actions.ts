"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { guardOrgWritable } from "@/lib/billing";
import { getServerT } from "@/lib/i18n/server";

interface GroupInput {
  id?: string;
  name: string;
  email?: string;
  description?: string;
  color?: string;
}

export async function upsertGroup(
  input: GroupInput,
): Promise<{ id?: string; error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("adm_grp_err_not_logged_in") };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return { error: t("adm_grp_err_requires_admin") };

  let orgId: string;
  try {
    orgId = await getCurrentOrgId(supabase);
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const payload = {
    name: input.name.trim(),
    email: input.email?.trim() || null,
    description: input.description?.trim() || null,
    color: input.color || "#9A9AA4",
  };

  if (input.id) {
    const { error } = await supabase
      .from("groups")
      .update(payload)
      .eq("id", input.id);
    if (error) return { error: error.message };
    revalidatePath("/admin/grupper");
    revalidatePath(`/admin/grupper/${input.id}`);
    return { id: input.id };
  }
  const { data, error } = await supabase
    .from("groups")
    .insert({ ...payload, organization_id: orgId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin/grupper");
  return { id: data.id };
}

export async function deleteGroup(input: {
  id: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("groups").delete().eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/admin/grupper");
  return {};
}

const OP_TEAM_COLORS = [
  "#F47920", "#3B82F6", "#10B981", "#EC4899", "#7C3AED",
  "#F59E0B", "#EF4444", "#06B6D4", "#84CC16", "#A855F7",
  "#14B8A6", "#F472B6",
];

// Generer OP-01 ... OP-22 som team-grupper hvis de ikke allerede finnes.
// Hver får en konsistent farge basert på nummeret.
export async function generateOpTeams(): Promise<{
  created: number;
  skipped: number;
  error?: string;
}> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { created: 0, skipped: 0, error: t("adm_grp_err_not_logged_in") };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin")
    return { created: 0, skipped: 0, error: t("adm_grp_err_requires_admin") };

  let orgId: string;
  try {
    orgId = await getCurrentOrgId(supabase);
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { created: 0, skipped: 0, error: (e as Error).message };
  }

  // Hent eksisterende OP-team-navn
  const { data: existing } = await supabase
    .from("groups")
    .select("name")
    .like("name", "OP-%");
  const existingNames = new Set((existing ?? []).map((g) => g.name));

  // Bygg liste av OP-01 til OP-22
  const toCreate: Array<{
    organization_id: string;
    name: string;
    color: string;
    description: string;
  }> = [];
  for (let i = 1; i <= 22; i++) {
    const name = `OP-${String(i).padStart(2, "0")}`;
    if (existingNames.has(name)) continue;
    toCreate.push({
      organization_id: orgId,
      name,
      color: OP_TEAM_COLORS[(i - 1) % OP_TEAM_COLORS.length],
      description: `Team ${name} — feltteam for prosjektutførelse.`,
    });
  }

  if (toCreate.length === 0) {
    return { created: 0, skipped: 22 };
  }

  const { error } = await supabase.from("groups").insert(toCreate);
  if (error) return { created: 0, skipped: 0, error: error.message };

  revalidatePath("/admin/grupper");
  revalidatePath("/produksjonsplan");
  return {
    created: toCreate.length,
    skipped: 22 - toCreate.length,
  };
}

export async function updateMembers(input: {
  groupId: string;
  userIds: string[];
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  // Hent eksisterende medlemmer
  const { data: existing } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", input.groupId);
  const existingIds = new Set(
    (existing ?? []).map((m) => m.user_id),
  );
  const wantedIds = new Set(input.userIds);

  // Beregn diff
  const toAdd = [...wantedIds].filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !wantedIds.has(id));

  if (toAdd.length > 0) {
    const { error: insertErr } = await supabase.from("group_members").insert(
      toAdd.map((uid) => ({
        group_id: input.groupId,
        user_id: uid,
      })),
    );
    if (insertErr) return { error: insertErr.message };
  }
  if (toRemove.length > 0) {
    const { error: deleteErr } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", input.groupId)
      .in("user_id", toRemove);
    if (deleteErr) return { error: deleteErr.message };
  }

  revalidatePath(`/admin/grupper/${input.groupId}`);
  revalidatePath("/admin/grupper");
  return {};
}
