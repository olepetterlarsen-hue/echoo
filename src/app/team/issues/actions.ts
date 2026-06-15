"use server";

import { revalidatePath } from "next/cache";
import { requireEchooStaff, staffAdminClient } from "@/lib/team/staff";

type Status = "apen" | "under_arbeid" | "lukket";

// Echoo-staff oppdaterer issue-rapporter på tvers av kunder.
// Bruker service_role (omgår per-kunde RLS) men kun etter requireEchooStaff.
export async function updateIssueStaff(input: {
  id: string;
  status?: Status;
  admin_notes?: string;
}): Promise<{ error?: string }> {
  try {
    await requireEchooStaff();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const admin = await staffAdminClient();

  const patch: {
    status?: Status;
    admin_notes?: string | null;
    resolved_at?: string | null;
  } = {};
  if (input.status) {
    patch.status = input.status;
    patch.resolved_at =
      input.status === "lukket" ? new Date().toISOString() : null;
  }
  if (input.admin_notes !== undefined) {
    patch.admin_notes = input.admin_notes || null;
  }

  const { error } = await admin
    .from("issue_reports")
    .update(patch as never)
    .eq("id", input.id);
  if (error) return { error: error.message };

  revalidatePath("/team/issues");
  revalidatePath("/team");
  return {};
}
