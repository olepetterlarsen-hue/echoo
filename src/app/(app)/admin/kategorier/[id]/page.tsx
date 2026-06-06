import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { CategoryForm } from "../category-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: PageProps) {
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

  const { data: category } = await supabase
    .from("project_categories")
    .select("*")
    .eq("id", id)
    .single();
  if (!category) notFound();

  const { t } = await getServerT();

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("adm_cat_edit_page_title")}</h1>
        <p className="text-text-2 text-sm">{category.name}</p>
      </header>
      <CategoryForm mode="edit" category={category} />
    </div>
  );
}
