"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface SaveProfileInput {
  full_name: string;
  title: string;
  phone: string;
  signature_data_url: string | null;
  notify_deviation_assigned?: boolean;
  notify_comment_added?: boolean;
  notify_task_assigned?: boolean;
  notify_daily_digest?: boolean;
}

export async function saveProfile(input: SaveProfileInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ikke logget inn." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name.trim() || null,
      title: input.title.trim() || null,
      phone: input.phone.trim() || null,
      signature_data_url: input.signature_data_url,
      notify_deviation_assigned: input.notify_deviation_assigned ?? true,
      notify_comment_added: input.notify_comment_added ?? true,
      notify_task_assigned: input.notify_task_assigned ?? true,
      notify_daily_digest: input.notify_daily_digest ?? false,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profil");
}
