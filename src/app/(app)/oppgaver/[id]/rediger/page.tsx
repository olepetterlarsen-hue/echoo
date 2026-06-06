import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTaskTypes, getGroups } from "@/lib/cache/static-data";
import { getServerT } from "@/lib/i18n/server";
import { EditTaskForm } from "./edit-task-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTaskPage({ params }: PageProps) {
  const { t } = await getServerT();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: task },
    { data: projects },
    { data: profiles },
    groups,
    taskTypes,
  ] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", id).single(),
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
  if (!task) notFound();

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("task_edit_title")}</h1>
        <p className="text-text-2 text-sm">{task.title}</p>
      </header>
      <EditTaskForm
        task={task}
        projects={projects ?? []}
        profiles={profiles ?? []}
        groups={groups}
        taskTypes={taskTypes}
      />
    </div>
  );
}
