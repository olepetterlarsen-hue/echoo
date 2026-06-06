import { createClient } from "@/lib/supabase/server";
import type { AppSettings } from "@/lib/types/database";

// Placeholder-fallback brukt før org er konfigurert (eller hvis lookup
// feiler). I praksis hentes verdiene per organisasjon fra organizations-
// tabellen — se src/lib/org-settings.ts for multi-tenant getOrgSettings.
const FALLBACK: AppSettings = {
  id: "company",
  firma: "Bedriftsnavn",
  org_nr: "",
  selskap_adresse: "",
  selskap_postnr: "",
  selskap_sted: "",
  selskap_telefon: "",
  selskap_epost: "",
  installator_navn: "",
  installator_tittel: "",
  installator_telefon: "",
  installator_epost: "",
  updated_at: new Date().toISOString(),
  updated_by: null,
};

export async function getAppSettings(): Promise<AppSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", "company")
    .single();
  return (data as AppSettings | null) ?? FALLBACK;
}
