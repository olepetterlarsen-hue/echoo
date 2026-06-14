import Link from "next/link";
import { Settings2 } from "lucide-react";
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

  const hasStages = stages.length > 0;

  return (
    <div className="px-6 py-6 max-w-[1800px] mx-auto space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("kanban_title")}</h1>
          <p className="text-text-2 text-sm">{t("kanban_subtitle")}</p>
        </div>
        <Link
          href="/admin/prosjekt-oppsett?tab=stadier"
          className="inline-flex items-center gap-1.5 rounded-md bg-card border border-border px-3 py-2 text-sm text-text-2 hover:bg-card-hover hover:text-text-1"
        >
          <Settings2 className="size-4" />
          Tilpass stadier
        </Link>
      </header>

      {!hasStages ? (
        <div className="bg-card border border-dashed border-border rounded-lg p-8 text-center space-y-3">
          <div className="text-text-2 font-medium">
            Ingen stadier definert ennå.
          </div>
          <p className="text-sm text-text-3 max-w-md mx-auto">
            Stadier er kolonnene som prosjekter flyter gjennom på kanban-tavla.
            Lag dine egne i prosjekt-oppsett — for eksempel «Tilbud → Befaring →
            Planlegging → Utførelse → Sluttkontroll → Ferdig».
          </p>
          <Link
            href="/admin/prosjekt-oppsett?tab=stadier"
            className="inline-flex items-center gap-1.5 rounded-md bg-orange text-bg px-4 py-2 text-sm font-medium hover:bg-orange/90"
          >
            <Settings2 className="size-4" />
            Sett opp stadier
          </Link>
        </div>
      ) : (
        <>
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
          <p className="text-xs text-text-3 text-center pt-2">
            Stadier legges til, sorteres og fargelegges i{" "}
            <Link
              href="/admin/prosjekt-oppsett?tab=stadier"
              className="text-orange hover:underline"
            >
              /admin/prosjekt-oppsett
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}
