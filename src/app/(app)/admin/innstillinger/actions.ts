"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import type { Database } from "@/lib/types/database";

type Patch = Database["public"]["Tables"]["app_settings"]["Update"];

interface Input {
  firma: string;
  org_nr: string;
  selskap_adresse: string;
  selskap_postnr: string;
  selskap_sted: string;
  selskap_telefon: string;
  selskap_epost: string;
  installator_navn: string;
  installator_tittel: string;
  installator_telefon: string;
  installator_epost: string;
}

function clean(v: string): string | null {
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function saveSettings(input: Input): Promise<{ error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("adm_set_err_not_logged_in") };

  const patch: Patch = {
    firma: input.firma.trim() || "Bedriftsnavn",
    org_nr: clean(input.org_nr),
    selskap_adresse: clean(input.selskap_adresse),
    selskap_postnr: clean(input.selskap_postnr),
    selskap_sted: clean(input.selskap_sted),
    selskap_telefon: clean(input.selskap_telefon),
    selskap_epost: clean(input.selskap_epost),
    installator_navn: clean(input.installator_navn),
    installator_tittel: clean(input.installator_tittel),
    installator_telefon: clean(input.installator_telefon),
    installator_epost: clean(input.installator_epost),
    updated_by: user.id,
  };

  const { error } = await supabase
    .from("app_settings")
    .update(patch)
    .eq("id", "company");

  if (error) return { error: error.message };
  revalidatePath("/admin/innstillinger");
  revalidatePath("/", "layout"); // PDF + alle sider som bruker selskapsinfo
  return {};
}
