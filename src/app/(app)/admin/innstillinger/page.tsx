import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { getAppSettings } from "@/lib/settings";
import { SettingsEditor } from "./settings-editor";
import { AdminTabs } from "@/components/app/admin-tabs";
import { SETTINGS_TABS } from "@/components/app/admin-tab-configs";

export default async function SettingsPage() {
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

  const settings = await getAppSettings();
  const { t } = await getServerT();

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Innstillinger</h1>
        <p className="text-text-2 text-sm">{t("adm_set_subtitle")}</p>
      </header>
      <AdminTabs tabs={SETTINGS_TABS} />
      <div className="max-w-3xl">
        <SettingsEditor settings={settings} />
      </div>
    </div>
  );
}
