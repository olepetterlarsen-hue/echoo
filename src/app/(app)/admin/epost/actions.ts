"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { sendEmail } from "@/lib/email/send";

export async function sendTestEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("adm_email_err_not_logged_in") };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") {
    return { ok: false, error: t("adm_email_err_admin_only") };
  }

  return sendEmail({
    to: input.to,
    subject: input.subject,
    text: input.body,
    category: "test",
    sent_by: user.id,
  });
}
