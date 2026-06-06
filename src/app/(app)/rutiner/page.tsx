import { createClient } from "@/lib/supabase/server";
import { RoutinesClient } from "./routines-client";
import type { Routine } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

export default async function RoutinesPage() {
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const isAdmin = myProfile?.role === "admin";

  const { data: routines } = await supabase
    .from("routines")
    .select("*")
    .eq("active", true)
    .order("number");

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("routine_page_title")}</h1>
        <p className="text-text-2 text-sm">
          {t("routine_subtitle_base")}
          {isAdmin && t("routine_subtitle_admin_suffix")}
        </p>
      </header>
      <RoutinesClient
        initial={(routines ?? []) as Routine[]}
        isAdmin={isAdmin}
      />
    </div>
  );
}
