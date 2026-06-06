import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { TemplateForm } from "../template-form";

export default async function NewTemplatePage() {
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

  const [{ data: categories }, { data: profiles }, { data: stages }] =
    await Promise.all([
      supabase
        .from("project_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("order_index"),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("active", true)
        .order("full_name"),
      supabase
        .from("project_stages")
        .select("id, name")
        .eq("is_active", true)
        .order("order_index"),
    ]);

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("adm_ptpl_new_page_title")}</h1>
        <p className="text-text-2 text-sm">{t("adm_ptpl_new_page_subtitle")}</p>
      </header>
      <TemplateForm
        mode="create"
        categories={categories ?? []}
        profiles={profiles ?? []}
        stages={stages ?? []}
      />
    </div>
  );
}
