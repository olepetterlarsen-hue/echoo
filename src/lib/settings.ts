import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import type { AppSettings } from "@/lib/types/database";

// Placeholder-fallback brukt før org er konfigurert.
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

/**
 * Selskaps-innstillinger som brukes i PDF-rendering, e-postmaler, mfl.
 *
 * 2026-07-01: master-kilde flyttet fra single-tenant `app_settings`-
 * tabellen til den multi-tenant `organizations`-tabellen. Grunnen: både
 * /admin/bedrift og /admin/innstillinger skrev tilsynelatende samme data
 * til to steder, som skapte forvirring — men bare app_settings ble brukt
 * i PDF-en, så bedrift-siden så ut som den lagret men fikk aldri effekt.
 *
 * Nå leser vi fra `organizations` scopet til current org. app_settings
 * er ikke lenger master, men beholdes i DB inntil videre for at gammel
 * kode som ev. skriver til den ikke feiler.
 */
export async function getAppSettings(): Promise<AppSettings> {
  const supabase = await createClient();
  try {
    const orgId = await getCurrentOrgId(supabase);
    const { data } = await supabase
      .from("organizations")
      .select(
        "firma, org_nr, selskap_adresse, selskap_postnr, selskap_sted, selskap_telefon, selskap_epost, installator_navn, installator_tittel, installator_telefon, installator_epost, updated_at",
      )
      .eq("id", orgId)
      .single();
    if (data) {
      return {
        id: "company",
        firma: data.firma ?? "Bedriftsnavn",
        org_nr: data.org_nr ?? "",
        selskap_adresse: data.selskap_adresse ?? "",
        selskap_postnr: data.selskap_postnr ?? "",
        selskap_sted: data.selskap_sted ?? "",
        selskap_telefon: data.selskap_telefon ?? "",
        selskap_epost: data.selskap_epost ?? "",
        installator_navn: data.installator_navn ?? "",
        installator_tittel: data.installator_tittel ?? "",
        installator_telefon: data.installator_telefon ?? "",
        installator_epost: data.installator_epost ?? "",
        updated_at: data.updated_at ?? new Date().toISOString(),
        updated_by: null,
      };
    }
  } catch {
    // Ingen org (f.eks. før signup fullført) — falltilbake til placeholder.
  }
  return FALLBACK;
}
