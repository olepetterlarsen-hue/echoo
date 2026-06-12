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
    return { supabase, error: t("sched_err_no_rights") };
  }
  return { supabase, user };
}

interface OffInput {
  id?: string;
  group_id?: string | null;
  start_date: string;
  end_date: string;
  reason: string;
  notes?: string;
  locked?: boolean;
  locked_reason?: string;
}

export async function upsertOffPeriod(
  input: OffInput,
): Promise<{ id?: string; error?: string }> {
  const { supabase, user, error } = await requireWriteRole();
  if (error) return { error };

  const payload = {
    group_id: input.group_id || null,
    start_date: input.start_date,
    end_date: input.end_date,
    reason: input.reason,
    notes: input.notes?.trim() || null,
    locked: input.locked ?? false,
    locked_reason: input.locked ? (input.locked_reason?.trim() || null) : null,
  };

  if (input.id) {
    const { error: err } = await supabase
      .from("schedule_off_periods")
      .update(payload)
      .eq("id", input.id);
    if (err) return { error: err.message };
    revalidatePath("/produksjonsplan");
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
    .from("schedule_off_periods")
    .insert({ ...payload, organization_id: orgId, created_by: user?.id })
    .select("id")
    .single();
  if (insertErr) return { error: insertErr.message };
  revalidatePath("/produksjonsplan");
  return { id: data.id };
}

export async function deleteOffPeriod(input: {
  id: string;
}): Promise<{ error?: string }> {
  const { supabase, error } = await requireWriteRole();
  if (error) return { error };
  const { error: err } = await supabase
    .from("schedule_off_periods")
    .delete()
    .eq("id", input.id);
  if (err) return { error: err.message };
  revalidatePath("/produksjonsplan");
  return {};
}
