import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { NewTemplateBuilder } from "./new-template-builder";

interface PageProps {
  searchParams: Promise<{ ai?: string }>;
}

export default async function NyMalPage({ searchParams }: PageProps) {
  const { ai } = await searchParams;
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

  const hasAiKey = Boolean(process.env.ANTHROPIC_API_KEY);

  const { t } = await getServerT();

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/maler"
          className="text-text-3 hover:text-text-1 text-sm"
        >
          {t("adm_tpl_back_to_list")}
        </Link>
        <h1 className="text-2xl font-semibold">{t("adm_tpl_ny_page_title")}</h1>
        <p className="text-text-2 text-sm">{t("adm_tpl_ny_page_subtitle")}</p>
      </header>
      <NewTemplateBuilder startInAiMode={ai === "1"} hasAiKey={hasAiKey} />
    </div>
  );
}
