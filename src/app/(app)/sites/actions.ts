"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";

interface SiteInput {
  customer_id?: string | null;
  external_site_id?: string;
  name: string;
  address?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  ssb_number?: string;
  latitude?: number | null;
  longitude?: number | null;
  site_type?: string;
  notes?: string;
}

function clean(v: string | undefined): string | null {
  if (v === undefined) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createSite(input: SiteInput): Promise<{
  id?: string;
  error?: string;
}> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("site_err_not_logged_in") };

  const { data, error } = await supabase
    .from("sites")
    .insert({
      customer_id: input.customer_id || null,
      external_site_id: clean(input.external_site_id),
      name: input.name.trim(),
      address: clean(input.address),
      postal_code: clean(input.postal_code),
      city: clean(input.city),
      province: clean(input.province),
      ssb_number: clean(input.ssb_number),
      latitude: input.latitude,
      longitude: input.longitude,
      site_type: clean(input.site_type),
      notes: clean(input.notes),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/sites");
  revalidatePath("/kart");
  return { id: data.id };
}

export async function updateSite(
  input: SiteInput & { id: string },
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { id, ...rest } = input;

  const { error } = await supabase
    .from("sites")
    .update({
      customer_id: rest.customer_id || null,
      external_site_id: clean(rest.external_site_id),
      name: rest.name.trim(),
      address: clean(rest.address),
      postal_code: clean(rest.postal_code),
      city: clean(rest.city),
      province: clean(rest.province),
      ssb_number: clean(rest.ssb_number),
      latitude: rest.latitude,
      longitude: rest.longitude,
      site_type: clean(rest.site_type),
      notes: clean(rest.notes),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/sites");
  revalidatePath(`/sites/${id}`);
  revalidatePath("/kart");
  return { id };
}

export async function deleteSite(input: {
  id: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("sites").delete().eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/sites");
  revalidatePath("/kart");
  return {};
}
