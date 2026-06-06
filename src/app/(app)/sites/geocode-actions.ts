"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { geocodeAddress, buildSearchString } from "@/lib/geocode";

export async function geocodeSite(input: {
  siteId: string;
}): Promise<{ latitude?: number; longitude?: number; error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const { data: site, error: fetchErr } = await supabase
    .from("sites")
    .select("address, postal_code, city, province")
    .eq("id", input.siteId)
    .single();

  if (fetchErr || !site) {
    return { error: t("site_err_not_found") };
  }

  const query = buildSearchString(site);
  if (!query || query === "Norway") {
    return { error: t("site_err_no_address_info") };
  }

  const result = await geocodeAddress(query);
  if (!result) {
    return { error: t("site_err_no_coords_found") };
  }

  const { error: updateErr } = await supabase
    .from("sites")
    .update({
      latitude: result.latitude,
      longitude: result.longitude,
    })
    .eq("id", input.siteId);

  if (updateErr) return { error: updateErr.message };

  revalidatePath("/sites");
  revalidatePath(`/sites/${input.siteId}`);
  revalidatePath("/kart");
  return result;
}

// Hent alle sites som mangler koordinater
export async function getSitesNeedingGeocode(): Promise<
  Array<{ id: string; name: string; address: string | null }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("id, name, address")
    .eq("active", true)
    .is("latitude", null)
    .not("address", "is", null);
  return data ?? [];
}
