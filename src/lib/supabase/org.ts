import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Returnerer org_id og user_id i ett kall.
 *
 * React.cache: dedupes per request så lenge samme klient-instans brukes
 * (createClient i server.ts er selv cache-wrappet). Layout, page og
 * server actions i samme request gjør dermed bare ett getUser+profile-kall.
 *
 * RLS sikrer at insert mot org-scopede tabeller _krever_ at organization_id
 * matcher current_organization_id(). Migration 040 setter en before-insert
 * trigger som defaulter feltet, men server actions kaller denne for å være
 * eksplisitt (defense in depth) og for å feile tidlig på ugyldig sesjon.
 */
export const getOrgAndUser = cache(
  async (
    supabase: SupabaseClient<Database>,
  ): Promise<{ orgId: string; userId: string }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Ikke innlogget");

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (error) throw new Error(error.message);
    if (!profile?.organization_id) {
      throw new Error("Brukeren mangler organisasjon");
    }
    return { orgId: profile.organization_id, userId: user.id };
  },
);

/**
 * Returns the current authenticated user's organization_id.
 */
export async function getCurrentOrgId(
  supabase: SupabaseClient<Database>,
): Promise<string> {
  const { orgId } = await getOrgAndUser(supabase);
  return orgId;
}
