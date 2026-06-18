import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { UserAdminClient } from "./user-admin-client";
import { AdminTabs } from "@/components/app/admin-tabs";
import { USERS_TABS } from "@/components/app/admin-tab-configs";

export default async function AdminUsersPage() {
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

  if (me?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  const { t } = await getServerT();

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Brukere &amp; Grupper</h1>
        <p className="text-text-2 text-sm">{t("adm_user_subtitle")}</p>
      </header>
      <AdminTabs tabs={USERS_TABS} />
      <UserAdminClient users={users ?? []} />
    </div>
  );
}
