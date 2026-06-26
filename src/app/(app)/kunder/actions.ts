"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { guardOrgWritable } from "@/lib/billing";
import { getServerT } from "@/lib/i18n/server";

interface CustomerInput {
  name: string;
  customer_type?: "bedrift" | "privat";
  first_name?: string;
  last_name?: string;
  org_number?: string;
  contact_person?: string;
  contact_person_role?: string;
  contact_person_phone_alt?: string;
  contact_person_address?: string;
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
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message || t("cust_err_not_logged_in") };
  }

  const customerType: "bedrift" | "privat" = input.customer_type === "privat" ? "privat" : "bedrift";
  const { data, error } = await supabase
    .from("customers")
    .insert({
      organization_id: orgId,
      customer_type: customerType,
      name: input.name.trim(),
      first_name: customerType === "privat" ? clean(input.first_name) : null,
      last_name: customerType === "privat" ? clean(input.last_name) : null,
      org_number: customerType === "bedrift" ? clean(input.org_number) : null,
      contact_person: clean(input.contact_person),
      contact_person_role: clean(input.contact_person_role),
      contact_person_phone_alt: clean(input.contact_person_phone_alt),
      contact_person_address: clean(input.contact_person_address),
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

  if (error) return { error: friendlyError(error.message, t) };
  revalidatePath("/kunder");
  return { id: data.id };
}

function friendlyError(msg: string, t: (k: string) => string): string {
  // Postgres unique_violation på partial index "customers_orgnr_unique_per_org"
  if (msg.includes("customers_orgnr_unique_per_org") || msg.toLowerCase().includes("duplicate key")) {
    return t("cust_err_orgnr_duplicate");
  }
  return msg;
}

export async function updateCustomer(
  input: CustomerInput & { id: string },
): Promise<{ id?: string; error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const { id, ...rest } = input;

  const customerType: "bedrift" | "privat" = rest.customer_type === "privat" ? "privat" : "bedrift";
  const { error } = await supabase
    .from("customers")
    .update({
      customer_type: customerType,
      name: rest.name.trim(),
      first_name: customerType === "privat" ? clean(rest.first_name) : null,
      last_name: customerType === "privat" ? clean(rest.last_name) : null,
      org_number: customerType === "bedrift" ? clean(rest.org_number) : null,
      contact_person: clean(rest.contact_person),
      contact_person_role: clean(rest.contact_person_role),
      contact_person_phone_alt: clean(rest.contact_person_phone_alt),
      contact_person_address: clean(rest.contact_person_address),
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

  if (error) return { error: friendlyError(error.message, t) };
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
