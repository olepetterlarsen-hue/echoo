"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { getServerT } from "@/lib/i18n/server";

interface UpsertInput {
  id?: string;
  name: string;
  manufacturer?: string;
  cas_number?: string;
  usage_area?: string;
  storage_location?: string;
  ghs_pictograms: string[];
  hazard_statements?: string;
  precautionary_measures?: string;
  sds_file_path?: string | null;
  sds_revision_date?: string | null;
  quantity_estimate?: string;
  notes?: string;
  active?: boolean;
}

function clean(v: string | undefined): string | null {
  if (v === undefined) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export async function upsertSubstance(
  input: UpsertInput,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { t } = await getServerT();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
  } catch {
    return { error: t("form_err_not_logged_in") };
  }

  if (!input.name.trim()) return { error: t("subs_err_name_required") };

  const payload = {
    name: input.name.trim(),
    manufacturer: clean(input.manufacturer),
    cas_number: clean(input.cas_number),
    usage_area: clean(input.usage_area),
    storage_location: clean(input.storage_location),
    ghs_pictograms: input.ghs_pictograms ?? [],
    hazard_statements: clean(input.hazard_statements),
    precautionary_measures: clean(input.precautionary_measures),
    sds_file_path: input.sds_file_path ?? null,
    sds_revision_date: input.sds_revision_date || null,
    quantity_estimate: clean(input.quantity_estimate),
    notes: clean(input.notes),
    active: input.active ?? true,
  };

  if (input.id) {
    const { error } = await supabase
      .from("substances")
      .update(payload)
      .eq("id", input.id);
    if (error) return { error: error.message };
    revalidatePath("/stoffkartotek");
    revalidatePath(`/stoffkartotek/${input.id}`);
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("substances")
    .insert({ ...payload, organization_id: orgId, created_by: userId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/stoffkartotek");
  return { id: data.id };
}

export async function deleteSubstance(input: {
  id: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  // Hent first for å vite om vi må slette SDS-fil også
  const { data: existing } = await supabase
    .from("substances")
    .select("sds_file_path")
    .eq("id", input.id)
    .single();
  const { error } = await supabase
    .from("substances")
    .delete()
    .eq("id", input.id);
  if (error) return { error: error.message };
  if (existing?.sds_file_path) {
    await supabase.storage
      .from("substance-sds")
      .remove([existing.sds_file_path]);
  }
  revalidatePath("/stoffkartotek");
  return {};
}

// Generer en signed URL for SDS-PDF (gyldig 1 time)
export async function getSdsSignedUrl(input: {
  path: string;
}): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("substance-sds")
    .createSignedUrl(input.path, 3600);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}
