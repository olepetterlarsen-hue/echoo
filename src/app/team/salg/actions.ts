"use server";

import { revalidatePath } from "next/cache";
import { staffAdminClient, requireEchooStaff } from "@/lib/team/staff";

export async function assignSalesperson(input: {
  organization_id: string;
  salesperson_id: string | null;
  notes?: string;
}): Promise<{ error?: string }> {
  let staff;
  try {
    staff = await requireEchooStaff();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const admin = await staffAdminClient();

  if (!input.salesperson_id) {
    // Fjern tildeling
    const { error } = await admin
      .from("sales_assignments")
      .delete()
      .eq("organization_id", input.organization_id);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin
      .from("sales_assignments")
      .upsert(
        {
          organization_id: input.organization_id,
          salesperson_id: input.salesperson_id,
          assigned_by: staff.id,
          notes: input.notes?.trim() || null,
        } as never,
        { onConflict: "organization_id" },
      );
    if (error) return { error: error.message };
  }

  revalidatePath("/team/salg");
  revalidatePath("/team/kunder");
  revalidatePath("/team");
  return {};
}
