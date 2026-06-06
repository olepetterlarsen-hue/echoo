import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { getCurrentOrgSettings } from "@/lib/org-settings";
import { OrgSettingsEditor } from "./editor";

export default async function AdminBedriftPage() {
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

  const { t } = await getServerT();
  const org = await getCurrentOrgSettings();
  if (!org) redirect("/onboarding");

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("adm_org_title")}</h1>
        <p className="text-text-2 text-sm">{t("adm_org_subtitle")}</p>
      </header>
      <OrgSettingsEditor org={org} />
    </div>
  );
}
