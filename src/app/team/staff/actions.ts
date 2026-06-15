"use server";

import { revalidatePath } from "next/cache";
import { requireEchooStaff, staffAdminClient } from "@/lib/team/staff";

export async function toggleEchooStaff(input: {
  profile_id: string;
  is_echoo_staff: boolean;
}): Promise<{ error?: string }> {
  try {
    await requireEchooStaff();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const admin = await staffAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_echoo_staff: input.is_echoo_staff } as never)
    .eq("id", input.profile_id);
  if (error) return { error: error.message };
  revalidatePath("/team/staff");
  revalidatePath("/team/salg");
  return {};
}

export async function searchProfile(email: string): Promise<{
  found?: { id: string; email: string; full_name: string | null; is_echoo_staff: boolean };
  error?: string;
}> {
  try {
    await requireEchooStaff();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const admin = await staffAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, full_name, is_echoo_staff")
    .ilike("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Fant ingen bruker med den e-posten." };
  return { found: data };
}
