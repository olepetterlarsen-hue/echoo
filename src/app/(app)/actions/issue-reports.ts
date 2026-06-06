"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";

interface SubmitArgs {
  title: string;
  description: string;
  severity: "lav" | "middels" | "hoey";
  page_url: string;
  user_agent: string | null;
}

export async function submitIssueReport(args: SubmitArgs) {
  const { t } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("auth_invalid") };

  if (!args.title.trim()) {
    return { error: t("issue_title_label") + ": " + t("required") };
  }

  const { error } = await supabase.from("issue_reports").insert({
    reported_by: user.id,
    title: args.title.trim().slice(0, 200),
    description: args.description.trim().slice(0, 2000) || null,
    severity: args.severity,
    page_url: args.page_url.slice(0, 500),
    user_agent: args.user_agent?.slice(0, 500) ?? null,
  });

  if (error) {
    return { error: t("issue_send_failed") };
  }
  return { ok: true };
}

export async function updateIssueReport(args: {
  id: string;
  status?: "apen" | "under_arbeid" | "lukket";
  admin_notes?: string;
}) {
  const { t } = await getServerT();
  const supabase = await createClient();

  const patch: {
    status?: "apen" | "under_arbeid" | "lukket";
    admin_notes?: string | null;
    resolved_at?: string | null;
  } = {};
  if (args.status) {
    patch.status = args.status;
    patch.resolved_at = args.status === "lukket" ? new Date().toISOString() : null;
  }
  if (args.admin_notes !== undefined) {
    patch.admin_notes = args.admin_notes || null;
  }

  const { error } = await supabase
    .from("issue_reports")
    .update(patch)
    .eq("id", args.id);
  if (error) return { error: t("issue_send_failed") };
  return { ok: true };
}
