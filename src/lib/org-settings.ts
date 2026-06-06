import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/lib/types/database";

// Hent gjeldende brukers organisasjons-innstillinger. Returnerer null hvis
// brukeren ikke er logget inn eller ikke tilhører en org enda.
export async function getCurrentOrgSettings(): Promise<Organization | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single();
  return (org as Organization | null) ?? null;
}
