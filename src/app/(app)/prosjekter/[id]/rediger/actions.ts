"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database, InstallationType, ProjectPhase } from "@/lib/types/database";

type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

interface Input {
  id: string;
  title: string;
  description?: string;
  installation_type?: InstallationType;
  phase?: ProjectPhase;
  category_id?: string;
  category_data?: Record<string, unknown>;
  customer_id?: string;
  site_id?: string;
  stage_id?: string;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
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

function clean(v: string | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function updateProject(input: Input): Promise<{ error?: string }> {
  const supabase = await createClient();
  const patch: ProjectUpdate = {
    title: input.title.trim(),
    description: clean(input.description),
    installation_type: input.installation_type,
    phase: input.phase,
    category_id:
      input.category_id === "" ? null : input.category_id ?? undefined,
    category_data: input.category_data ?? undefined,
    customer_id: input.customer_id === "" ? null : input.customer_id ?? null,
    site_id: input.site_id === "" ? null : input.site_id ?? null,
    stage_id: input.stage_id === "" ? null : input.stage_id ?? null,
    scheduled_start_date:
      input.scheduled_start_date === ""
        ? null
        : input.scheduled_start_date ?? null,
    scheduled_end_date:
      input.scheduled_end_date === ""
        ? null
        : input.scheduled_end_date ?? null,
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
  };

  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", input.id);
  if (error) return { error: error.message };

  revalidatePath(`/prosjekter/${input.id}`);
  revalidatePath("/prosjekter");
  return {};
}
