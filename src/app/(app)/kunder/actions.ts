"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { getServerT } from "@/lib/i18n/server";

interface CustomerInput {
  name: string;
  org_number?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  notes?: string;
  map_color?: string | null;
  active?: boolean;
}

function clean(v: string | undefined): string | null {
  if (v === undefined) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createCustomer(input: CustomerInput): Promise<{
  id?: string;
  error?: string;
}> {
  const { t } = await getServerT();
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
  } catch {
    return { error: t("cust_err_not_logged_in") };
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      org_number: clean(input.org_number),
      contact_person: clean(input.contact_person),
      email: clean(input.email),
      phone: clean(input.phone),
      address: clean(input.address),
      postal_code: clean(input.postal_code),
      city: clean(input.city),
      notes: clean(input.notes),
      map_color: input.map_color ?? null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/kunder");
  return { id: data.id };
}

export async function updateCustomer(
  input: CustomerInput & { id: string },
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { id, ...rest } = input;

  const { error } = await supabase
    .from("customers")
    .update({
      name: rest.name.trim(),
      org_number: clean(rest.org_number),
      contact_person: clean(rest.contact_person),
      email: clean(rest.email),
      phone: clean(rest.phone),
      address: clean(rest.address),
      postal_code: clean(rest.postal_code),
      city: clean(rest.city),
      notes: clean(rest.notes),
      map_color: rest.map_color ?? null,
      active: rest.active ?? true,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/kunder");
  revalidatePath(`/kunder/${id}`);
  return { id };
}

export async function deleteCustomer(input: {
  id: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/kunder");
  return {};
}
