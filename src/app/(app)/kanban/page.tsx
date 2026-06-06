import { createClient } from "@/lib/supabase/server";
import { getProjectStages } from "@/lib/cache/static-data";
import { getServerT } from "@/lib/i18n/server";
import { KanbanBoard } from "./kanban-board";

export default async function KanbanPage() {
  const { t } = await getServerT();
  const supabase = await createClient();

  // Stages er cached (sjelden endret). Prosjekter er live.
  const [stages, { data: projects }] = await Promise.all([
    getProjectStages(),
    supabase
      .from("projects")
      .select(
        "id, project_number, title, status, installation_type, stage_id, customer_id, " +
          "customer:customers(id, name, map_color)",
      )
      .neq("status", "arkivert")
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <div className="px-6 py-6 max-w-[1800px] mx-auto space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">{t("kanban_title")}</h1>
        <p className="text-text-2 text-sm">{t("kanban_subtitle")}</p>
      </header>
      <KanbanBoard
        stages={
          stages as unknown as Parameters<typeof KanbanBoard>[0]["stages"]
        }
        projects={
          (projects ?? []) as unknown as Parameters<
            typeof KanbanBoard
          >[0]["projects"]
        }
      />
    </div>
  );
}
