"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Routine } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

export async function downloadRoutine(input: {
  filePath: string;
}): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("routines")
    .createSignedUrl(input.filePath, 300);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

export async function uploadRoutine(
  formData: FormData,
): Promise<{ routine?: Routine; error?: string }> {
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("form_err_not_logged_in") };

  // Sjekk admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: t("routine_err_only_admin") };
  }

  const file = formData.get("file") as File | null;
  const routineId = Number(formData.get("routine_id"));
  const language = formData.get("language") as "no" | "en";

  if (!file || file.size === 0) return { error: t("routine_err_missing_file") };
  if (!routineId) return { error: t("routine_err_missing_id") };
  if (language !== "no" && language !== "en")
    return { error: t("routine_err_invalid_language") };

  const path = `${routineId}/${language}.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from("routines")
    .upload(path, file, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadErr)
    return {
      error: t("routine_err_upload_failed").replace("{msg}", uploadErr.message),
    };

  const patch =
    language === "no" ? { file_path_no: path } : { file_path_en: path };
  const { data, error } = await supabase
    .from("routines")
    .update(patch)
    .eq("id", routineId)
    .select()
    .single();
  if (error) return { error: error.message };

  revalidatePath("/rutiner");
  return { routine: data as Routine };
}
