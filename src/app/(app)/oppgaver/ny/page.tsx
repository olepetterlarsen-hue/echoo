import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTaskTypes, getGroups } from "@/lib/cache/static-data";
import { getServerT } from "@/lib/i18n/server";
import { NewTaskForm } from "./new-task-form";

interface PageProps {
  searchParams: Promise<{ project?: string }>;
}

export default async function NewTaskPage({ searchParams }: PageProps) {
  const { t } = await getServerT();
  const { project } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Cached helpers for statisk data + parallelle queries for personalisert data
  const [{ data: projects }, { data: profiles }, groups, taskTypes] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, project_number, title")
        .order("updated_at", { ascending: false })
        .limit(200),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("active", true)
        .order("full_name"),
      getGroups(),
      getTaskTypes(),
    ]);

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("task_new")}</h1>
        <p className="text-text-2 text-sm">{t("task_new_subtitle")}</p>
      </header>
      <NewTaskForm
        projects={projects ?? []}
        profiles={profiles ?? []}
        groups={groups}
        taskTypes={taskTypes}
        defaultProjectId={project}
      />
    </div>
  );
}
