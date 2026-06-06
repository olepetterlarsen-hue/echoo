import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { IssuesClient } from "./issues-client";

export default async function AdminIssuesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: issues } = await supabase
    .from("issue_reports")
    .select(
      "id, title, description, severity, status, page_url, user_agent, admin_notes, created_at, resolved_at, reported_by, profiles:reported_by(full_name, email)",
    )
    .order("created_at", { ascending: false });

  const { t, locale } = await getServerT();

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("adm_iss_title")}</h1>
        <p className="text-text-2 text-sm">{t("adm_iss_subtitle")}</p>
      </header>
      <IssuesClient issues={issues ?? []} locale={locale} />
    </div>
  );
}
