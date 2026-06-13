"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgAndUser } from "@/lib/supabase/org";
import { guardOrgWritable } from "@/lib/billing";
import type {
  DeviationSeverity,
  DeviationRootCauseCategory,
} from "@/lib/types/database";

export async function createDeviationFromForm(input: {
  project_id: string;
  title: string;
  description: string;
  severity: DeviationSeverity;
  assigned_to: string | null;
  root_cause_category: DeviationRootCauseCategory | "" | null;
  root_cause_description: string;
  containment_action: string;
  corrective_action: string;
  responsible_id: string | null;
  due_date: string | null;
  ai_generated: boolean;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  let orgId: string;
  let userId: string;
  try {
    ({ orgId, userId } = await getOrgAndUser(supabase));
    await guardOrgWritable(supabase, orgId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (!input.project_id) return { error: "Prosjekt er påkrevd." };
  if (!input.title.trim()) return { error: "Tittel er påkrevd." };

  const { data, error } = await supabase
    .from("deviations")
    .insert({
      organization_id: orgId,
      project_id: input.project_id,
      title: input.title.trim(),
      description: input.description.trim() || null,
      severity: input.severity,
      reported_by: userId,
      assigned_to: input.assigned_to,
      root_cause_category:
        (input.root_cause_category || null) as DeviationRootCauseCategory | null,
      root_cause_description: input.root_cause_description.trim() || null,
      containment_action: input.containment_action.trim() || null,
      corrective_action: input.corrective_action.trim() || null,
      responsible_id: input.responsible_id,
      due_date: input.due_date,
      ai_generated: input.ai_generated,
    })
    .select("id, project_id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/avvik");
  if (data?.project_id) revalidatePath(`/prosjekter/${data.project_id}`);
  return { id: data.id };
}
