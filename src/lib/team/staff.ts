import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface EchooStaff {
  id: string;
  email: string;
  full_name: string | null;
  organization_id: string | null;
}

/**
 * Verifiserer at den innloggede brukeren er Echoo-ansatt.
 * Kaster hvis ikke. Returnerer profil-info.
 */
export async function requireEchooStaff(): Promise<EchooStaff> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Ikke innlogget");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, organization_id, is_echoo_staff")
    .eq("id", user.id)
    .single();
  if (!profile?.is_echoo_staff) {
    throw new Error("Ikke autorisert (krever Echoo-staff)");
  }
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    organization_id: profile.organization_id,
  };
}

/**
 * Service-role klient som ser PÅ TVERS av alle orgs.
 * Skal kun brukes inni /team-sub-appen etter requireEchooStaff har bestått.
 */
export async function staffAdminClient() {
  await requireEchooStaff();
  return createAdminClient();
}

/**
 * Helper for å sjekke is_echoo_staff uten å kaste.
 * Brukes f.eks. i AppShell for å vise "Team CRM"-link.
 */
export async function isEchooStaff(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("is_echoo_staff")
    .eq("id", user.id)
    .single();
  return data?.is_echoo_staff === true;
}
