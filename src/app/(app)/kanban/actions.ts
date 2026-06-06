"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function moveProjectToStage(input: {
  projectId: string;
  stageId: string | null;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ stage_id: input.stageId })
    .eq("id", input.projectId);

  if (error) return { error: error.message };
  revalidatePath("/kanban");
  revalidatePath(`/prosjekter/${input.projectId}`);
  return {};
}
