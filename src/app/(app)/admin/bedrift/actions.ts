"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";

interface SaveArgs {
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
  primary_color: string;
}

async function assertAdminOrg() {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("auth_invalid") };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: t("adm_user_err_missing_admin") };
  if (!profile.organization_id) return { error: t("auth_invalid") };
  return { supabase, t, orgId: profile.organization_id };
}

function clean(s: string): string | null {
  return s.trim() || null;
}

export async function saveOrgSettings(args: SaveArgs): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await assertAdminOrg();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("organizations")
    .update({
      firma: args.firma.trim() || "Bedriftsnavn",
      org_nr: clean(args.org_nr),
      selskap_adresse: clean(args.selskap_adresse),
      selskap_postnr: clean(args.selskap_postnr),
      selskap_sted: clean(args.selskap_sted),
      selskap_telefon: clean(args.selskap_telefon),
      selskap_epost: clean(args.selskap_epost),
      installator_navn: clean(args.installator_navn),
      installator_tittel: clean(args.installator_tittel),
      installator_telefon: clean(args.installator_telefon),
      installator_epost: clean(args.installator_epost),
      primary_color: args.primary_color || "#F47920",
    })
    .eq("id", ctx.orgId);
  if (error) return { error: error.message };
  revalidatePath("/admin/bedrift");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function uploadOrgLogo(args: {
  dataUrl: string;
  fileName: string;
  contentType: string;
}): Promise<{ error?: string; ok?: boolean; publicUrl?: string }> {
  const ctx = await assertAdminOrg();
  if ("error" in ctx) return { error: ctx.error };

  // Konverter dataURL → Buffer
  const base64 = args.dataUrl.split(",")[1];
  if (!base64) return { error: ctx.t("issue_send_failed") };
  const buffer = Buffer.from(base64, "base64");

  const ext = args.fileName.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${ctx.orgId}/logo-${Date.now()}.${ext}`;

  const { error: upErr } = await ctx.supabase.storage
    .from("org-logos")
    .upload(path, buffer, {
      contentType: args.contentType,
      upsert: true,
    });
  if (upErr) return { error: upErr.message };

  const { data: pub } = ctx.supabase.storage.from("org-logos").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { error: updErr } = await ctx.supabase
    .from("organizations")
    .update({ logo_url: publicUrl })
    .eq("id", ctx.orgId);
  if (updErr) return { error: updErr.message };

  revalidatePath("/admin/bedrift");
  revalidatePath("/dashboard");
  return { ok: true, publicUrl };
}

export async function removeOrgLogo(): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await assertAdminOrg();
  if ("error" in ctx) return { error: ctx.error };
  const { error } = await ctx.supabase
    .from("organizations")
    .update({ logo_url: null })
    .eq("id", ctx.orgId);
  if (error) return { error: error.message };
  revalidatePath("/admin/bedrift");
  return { ok: true };
}
