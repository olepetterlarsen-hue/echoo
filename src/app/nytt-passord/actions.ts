"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";

export async function setForcedPassword(input: {
  password: string;
}): Promise<{ error?: string }> {
  const { t } = await getServerT();
  if (input.password.length < 8) {
    return { error: t("signup_err_password_short") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("proj_err_not_signed_in") };

  const { error: updateErr } = await supabase.auth.updateUser({
    password: input.password,
  });
  if (updateErr) return { error: updateErr.message };

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);
  if (profileErr) return { error: profileErr.message };

  redirect("/dashboard");
}
