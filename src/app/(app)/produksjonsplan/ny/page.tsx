import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { NewScheduleForm } from "./new-schedule-form";

interface PageProps {
  searchParams: Promise<{ project?: string }>;
}

export default async function NewSchedulePage({ searchParams }: PageProps) {
  const { t } = await getServerT();
  const { project } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: projects }, { data: groups }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, project_number, title")
      .neq("status", "arkivert")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase.from("groups").select("id, name, color").order("name"),
  ]);

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("sched_new_title")}</h1>
        <p className="text-text-2 text-sm">{t("sched_new_subtitle")}</p>
      </header>
      <NewScheduleForm
        projects={projects ?? []}
        groups={groups ?? []}
        defaultProjectId={project}
      />
    </div>
  );
}
