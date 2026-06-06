import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { CustomTemplateEditor } from "./custom-template-editor";
import type { CustomTemplate } from "@/lib/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomTemplateEditPage({ params }: PageProps) {
  const { id } = await params;
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

  const { data: template } = await supabase
    .from("custom_templates")
    .select("*")
    .eq("id", id)
    .single();
  if (!template) notFound();

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
        <h1 className="text-2xl font-semibold">{template.name}</h1>
        <p className="text-text-2 text-sm">{t("adm_tpl_cust_subtitle")}</p>
      </header>
      <CustomTemplateEditor template={template as CustomTemplate} />
    </div>
  );
}
