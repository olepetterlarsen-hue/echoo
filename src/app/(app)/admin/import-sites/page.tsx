import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { ImportSitesClient } from "./import-client";

export default async function ImportSitesPage() {
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

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("adm_imp_title")}</h1>
        <p className="text-text-2 text-sm">
          {t("adm_imp_subtitle_p1")} <code>Name</code>,{" "}
          <code>No. of Systems</code> {t("adm_imp_subtitle_and")}{" "}
          <code>Address</code>
          {t("adm_imp_subtitle_p2")}
        </p>
      </header>
      <ImportSitesClient />
    </div>
  );
}
