import { createClient } from "@/lib/supabase/server";
import { CompetenceClient } from "./competence-client";
import type { Profile, UserRole } from "@/lib/types/database";
import { ELEVATED_ROLES } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

export default async function KompetansePage() {
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const myRole = (myProfile?.role ?? "elektriker") as UserRole;
  const canManageAll = ELEVATED_ROLES.includes(myRole);

  const { data: certificates } = await supabase
    .from("certificates")
    .select("*, profile:profiles(id, full_name, email, role)")
    .order("expires_date", { ascending: true, nullsFirst: false });

  // Admin / prosjektleder / installatør får liste over alle aktive brukere
  let users: Profile[] = [];
  if (canManageAll) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("active", true)
      .order("full_name");
    users = (data ?? []) as Profile[];
  } else if (myProfile) {
    users = [myProfile as Profile];
  }

  const subtitle = canManageAll
    ? t("cert_subtitle_all")
    : t("cert_subtitle_own");

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("cert_page_title")}</h1>
        <p className="text-text-2 text-sm">{subtitle}</p>
      </header>
      <CompetenceClient
        myUserId={user!.id}
        canManageAll={canManageAll}
        initial={
          (certificates ?? []) as unknown as Parameters<
            typeof CompetenceClient
          >[0]["initial"]
        }
        users={users}
      />
    </div>
  );
}
