import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProjectStages,
  getActiveCategories,
} from "@/lib/cache/static-data";
import { EditProjectForm } from "./edit-project-form";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { t } = await getServerT();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: project },
    { data: customers },
    { data: sites },
    stages,
    categories,
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase
      .from("customers")
      .select("id, name")
      .eq("active", true)
      .order("name"),
    supabase
      .from("sites")
      .select("id, name, customer_id")
      .eq("active", true)
      .order("name"),
    getProjectStages(),
    getActiveCategories(),
  ]);
  if (!project) notFound();

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("proj_edit_title")}</h1>
        <p className="text-text-2 text-sm font-mono">#{project.project_number}</p>
      </header>
      <EditProjectForm
        project={project}
        customers={customers ?? []}
        sites={sites ?? []}
        stages={stages}
        categories={categories}
      />
    </div>
  );
}
