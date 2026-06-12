"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
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
  } catch {
    return { error: t("proj_err_not_signed_in") };
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
      site_id: input.site_id || null,
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
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/prosjekter");
  return { id: data.id };
}
