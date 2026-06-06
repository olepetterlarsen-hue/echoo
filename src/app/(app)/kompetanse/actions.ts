"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Certificate } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

type CertWithProfile = Certificate & {
  profile?: { id: string; full_name: string | null; email: string; role: string } | null;
};

export async function uploadCertificate(formData: FormData): Promise<{
  error?: string;
  cert?: CertWithProfile;
}> {
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("form_err_not_logged_in") };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: t("cert_err_missing_file") };
  const profileId = (formData.get("profile_id") as string) || user.id;

  // Bruker må enten være eier eller admin (RLS håndhever — vi feiler tidlig hvis ikke)
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${profileId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("certificates")
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadErr)
    return {
      error: t("cert_err_upload_failed").replace("{msg}", uploadErr.message),
    };

  const { data, error } = await supabase
    .from("certificates")
    .insert({
      profile_id: profileId,
      name: (formData.get("name") as string).trim(),
      issuer: ((formData.get("issuer") as string) || "").trim() || null,
      issued_date: (formData.get("issued_date") as string) || null,
      expires_date: (formData.get("expires_date") as string) || null,
      file_path: path,
      notes: ((formData.get("notes") as string) || "").trim() || null,
    })
    .select(
      "*, profile:profiles(id, full_name, email, role)",
    )
    .single();

  if (error) {
    await supabase.storage.from("certificates").remove([path]);
    return { error: error.message };
  }

  revalidatePath("/kompetanse");
  return { cert: data as unknown as CertWithProfile };
}

export async function deleteCertificate(input: {
  id: string;
  filePath: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("certificates")
    .delete()
    .eq("id", input.id);
  if (error) return { error: error.message };
  await supabase.storage.from("certificates").remove([input.filePath]);
  revalidatePath("/kompetanse");
  return {};
}

export async function getCertificateUrl(input: { filePath: string }): Promise<{
  url?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("certificates")
    .createSignedUrl(input.filePath, 300);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}
