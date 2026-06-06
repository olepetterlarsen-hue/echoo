import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { getServerT } from "@/lib/i18n/server";
import { GanttBoard } from "./gantt-board";
import { OffPeriodDialog } from "./off-dialog";

interface PageProps {
  searchParams: Promise<{ start?: string; days?: string }>;
}

export default async function ProductionSchedulePage({ searchParams }: PageProps) {
  const { t, locale } = await getServerT();
  const { start, days } = await searchParams;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start = idag minus 7 dager som default
  const startDate = start
    ? new Date(start)
    : new Date(today.getTime() - 7 * 86400000);
  const daysCount = Math.max(14, Math.min(120, parseInt(days || "42", 10)));
  const endDate = new Date(
    startDate.getTime() + (daysCount - 1) * 86400000,
  );
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);

  const supabase = await createClient();

  // Hent grupper (swimlanes) + entries + off-perioder i vinduet + alle prosjekter (til popup-dropdown) + seksjoner
  // Sjekk om innlogget bruker er admin (for å vise rediger-rekkefølge-modus)
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = me?.role === "admin";

  const [
    { data: groups },
    { data: entries },
    { data: offPeriods },
    { data: allProjects },
    { data: sections },
  ] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, color, email, gantt_section_id, gantt_sort_order")
      .order("gantt_sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("schedule_entries")
      .select(
        "id, project_id, group_id, title, start_date, end_date, status, locked, locked_reason, projects(project_number, title, customer:customers(name, map_color))",
      )
      .gte("end_date", startStr)
      .lte("start_date", endStr)
      .order("start_date"),
    supabase
      .from("schedule_off_periods")
      .select("id, group_id, start_date, end_date, reason")
      .gte("end_date", startStr)
      .lte("start_date", endStr),
    supabase
      .from("projects")
      .select("id, project_number, title")
      .order("project_number", { ascending: false }),
    supabase
      .from("gantt_sections")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  // Bygg navigering
  const prevStart = new Date(startDate.getTime() - 7 * 86400000);
  const nextStart = new Date(startDate.getTime() + 7 * 86400000);
  const todayStr = formatDate(today);

  return (
    <div className="px-6 py-6 max-w-[1800px] mx-auto space-y-4">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Calendar className="size-6 text-text-2" />
            {t("sched_title")}
          </h1>
          <p className="text-text-2 text-sm">
            {t("sched_subtitle")}
            {entries?.length
              ? t("sched_visible_count").replace("{n}", String(entries.length))
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/produksjonsplan?start=${formatDate(prevStart)}&days=${daysCount}`}
          >
            <Button variant="secondary" size="sm">
              {t("sched_prev_week")}
            </Button>
          </Link>
          <Link
            href={`/produksjonsplan?start=${formatDate(new Date(today.getTime() - 3 * 86400000))}&days=${daysCount}`}
          >
            <Button size="sm">{t("sched_today")}</Button>
          </Link>
          <Link
            href={`/produksjonsplan?start=${formatDate(nextStart)}&days=${daysCount}`}
          >
            <Button variant="secondary" size="sm">
              {t("sched_next_week")}
            </Button>
          </Link>
          <OffPeriodDialog groups={groups ?? []} />
          <Link href="/produksjonsplan/ny">
            <Button size="sm">
              <Plus className="size-4" />
              {t("sched_place_job")}
            </Button>
          </Link>
        </div>
      </header>

      <GanttBoard
        groups={groups ?? []}
        sections={sections ?? []}
        entries={
          (entries ?? []) as unknown as Parameters<typeof GanttBoard>[0]["entries"]
        }
        offPeriods={offPeriods ?? []}
        projects={allProjects ?? []}
        startDate={startStr}
        endDate={endStr}
        todayStr={todayStr}
        dateLocale={locale === "en" ? "en-GB" : "no-NO"}
        isAdmin={isAdmin}
      />
    </div>
  );
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
