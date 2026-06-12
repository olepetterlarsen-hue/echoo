"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { guardOrgWritable } from "@/lib/billing";
import { getServerT } from "@/lib/i18n/server";

const ALLOWED_ROLES = ["admin", "installator", "bemyndiget", "prosjektleder"] as const;

async function requireWriteRole() {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: t("sched_err_not_logged_in") };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!me || !ALLOWED_ROLES.includes(me.role as never)) {
    return { supabase, error: t("sched_err_no_rights_edit") };
  }
  return { supabase, user };
}

interface UpsertInput {
  id?: string;
  project_id?: string | null;
  group_id?: string | null;
  title?: string | null;
  start_date: string;
  end_date: string;
  status?: string;
  locked?: boolean;
  locked_reason?: string | null;
  notes?: string | null;
}

export async function upsertScheduleEntry(
  input: UpsertInput,
): Promise<{ id?: string; error?: string }> {
  const { supabase, user, error } = await requireWriteRole();
  if (error) return { error };

  const payload = {
    project_id: input.project_id || null,
    group_id: input.group_id || null,
    title: input.title?.trim() || null,
    start_date: input.start_date,
    end_date: input.end_date,
    status: input.status || "planned",
    locked: input.locked ?? false,
    locked_reason: input.locked_reason?.trim() || null,
    notes: input.notes?.trim() || null,
  };

  if (input.id) {
    const { error: err } = await supabase
      .from("schedule_entries")
      .update(payload)
      .eq("id", input.id);
    if (err) return { error: err.message };
    revalidatePath("/produksjonsplan");
    if (payload.project_id) revalidatePath(`/prosjekter/${payload.project_id}`);
    return { id: input.id };
  }
  let orgId: string;
  try {
    orgId = await getCurrentOrgId(supabase);
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { data, error: insertErr } = await supabase
    .from("schedule_entries")
    .insert({ ...payload, organization_id: orgId, created_by: user?.id })
    .select("id")
    .single();
  if (insertErr) return { error: insertErr.message };
  revalidatePath("/produksjonsplan");
  if (payload.project_id) revalidatePath(`/prosjekter/${payload.project_id}`);
  return { id: data.id };
}

export async function deleteScheduleEntry(input: {
  id: string;
}): Promise<{ error?: string }> {
  const { supabase, error } = await requireWriteRole();
  if (error) return { error };
  const { error: err } = await supabase
    .from("schedule_entries")
    .delete()
    .eq("id", input.id);
  if (err) return { error: err.message };
  revalidatePath("/produksjonsplan");
  return {};
}

export async function moveScheduleEntry(input: {
  id: string;
  start_date: string;
  end_date: string;
  group_id?: string | null;
}): Promise<{ error?: string }> {
  const { supabase, error } = await requireWriteRole();
  if (error) return { error };
  const patch: {
    start_date: string;
    end_date: string;
    group_id?: string | null;
  } = {
    start_date: input.start_date,
    end_date: input.end_date,
  };
  if (input.group_id !== undefined) patch.group_id = input.group_id;
  const { error: err } = await supabase
    .from("schedule_entries")
    .update(patch)
    .eq("id", input.id);
  if (err) return { error: err.message };
  revalidatePath("/produksjonsplan");
  return {};
}
