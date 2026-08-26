"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { guardOrgWritable } from "@/lib/billing";
import type { InstallationType } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

interface Input {
  project_number: string;
  title: string;
  description?: string;
  installation_type?: InstallationType;
  customer_id?: string;
  site_id?: string;
  stage_id?: string;
  assigned_to?: string;
  customer_name?: string;
  customer_org_number?: string;
  customer_contact?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_postal_code?: string;
  customer_city?: string;
  site_company?: string;
  site_address?: string;
  site_house_number?: string;
  site_house_letter?: string;
  site_postal_code?: string;
  site_city?: string;
  site_ssb_number?: string;
}

function clean(v: string | undefined): string | null {
  if (v === undefined) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createProject(
  input: Input,
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const { t } = await getServerT();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message || t("proj_err_not_signed_in") };
  }

  // Auto-sync: hvis brukeren fyller inn site-adresse uten å velge eksisterende
  // site, opprett en site-rad samtidig så anlegget dukker opp i /sites og /kart.
  // Brukeren (Erik) klaget: "alle disse bør snakke sammen uten at du må legge
  // til alt manuelt i hver boks. rød tråd baby."
  let resolvedSiteId: string | null = input.site_id || null;
  const siteAddr = clean(input.site_address);
  if (!resolvedSiteId && siteAddr) {
    const siteName =
      clean(input.site_company) ||
      clean(input.site_address) ||
      input.title.trim();
    const { data: newSite, error: siteErr } = await supabase
      .from("sites")
      .insert({
        organization_id: orgId,
        customer_id: input.customer_id || null,
        name: siteName,
        address: siteAddr,
        postal_code: clean(input.site_postal_code),
        city: clean(input.site_city),
        ssb_number: clean(input.site_ssb_number),
        active: true,
        created_by: userId,
      })
      .select("id")
      .single();
    if (siteErr) return { error: siteErr.message };
    resolvedSiteId = newSite.id;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      organization_id: orgId,
      project_number: input.project_number.trim(),
      title: input.title.trim(),
      description: clean(input.description),
      installation_type: input.installation_type ?? "bolig",
      customer_id: input.customer_id || null,
      site_id: resolvedSiteId,
      stage_id: input.stage_id || null,
      customer_name: clean(input.customer_name),
      customer_org_number: clean(input.customer_org_number),
      customer_contact: clean(input.customer_contact),
      customer_email: clean(input.customer_email),
      customer_phone: clean(input.customer_phone),
      customer_address: clean(input.customer_address),
      customer_postal_code: clean(input.customer_postal_code),
      customer_city: clean(input.customer_city),
      site_company: clean(input.site_company),
      site_address: clean(input.site_address),
      site_house_number: clean(input.site_house_number),
      site_house_letter: clean(input.site_house_letter),
      site_postal_code: clean(input.site_postal_code),
      site_city: clean(input.site_city),
      site_ssb_number: clean(input.site_ssb_number),
      assigned_to: input.assigned_to || null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/prosjekter");
  if (resolvedSiteId) revalidatePath("/sites");
  return { id: data.id };
}
