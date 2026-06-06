import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { getServerT } from "@/lib/i18n/server";
import { S } from "@/lib/i18n/strings";
import { CalendarGrid, type CalendarEvent } from "./calendar-grid";

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

const MONTH_KEYS = [
  "cal_month_january",
  "cal_month_february",
  "cal_month_march",
  "cal_month_april",
  "cal_month_may",
  "cal_month_june",
  "cal_month_july",
  "cal_month_august",
  "cal_month_september",
  "cal_month_october",
  "cal_month_november",
  "cal_month_december",
] as const;

export default async function CalendarPage({ searchParams }: PageProps) {
  const { t, locale } = await getServerT();
  const { year, month } = await searchParams;
  const now = new Date();
  const y = year ? parseInt(year, 10) : now.getFullYear();
  const m = month ? parseInt(month, 10) : now.getMonth() + 1; // 1-12

  // Validér
  const safeYear = Number.isFinite(y) && y > 2000 && y < 2100 ? y : now.getFullYear();
  const safeMonth = Number.isFinite(m) && m >= 1 && m <= 12 ? m : now.getMonth() + 1;

  // Måneds-bounds (UTC for stabil sammenligning med Postgres date)
  const monthStart = new Date(Date.UTC(safeYear, safeMonth - 1, 1));
  const monthEnd = new Date(Date.UTC(safeYear, safeMonth, 0));
  const startStr = monthStart.toISOString().split("T")[0];
  const endStr = monthEnd.toISOString().split("T")[0];

  // Bygg neste/forrige måned-lenker
  const prevYear = safeMonth === 1 ? safeYear - 1 : safeYear;
  const prevMonth = safeMonth === 1 ? 12 : safeMonth - 1;
  const nextYear = safeMonth === 12 ? safeYear + 1 : safeYear;
  const nextMonth = safeMonth === 12 ? 1 : safeMonth + 1;

  const supabase = await createClient();

  // Hent alle hendelser i månedens span. Vi viser:
  //  - Prosjekter med scheduled_start/end innen måneden
  //  - Avvik registrert i måneden
  //  - Dokumenter signert i måneden
  const [{ data: scheduled }, { data: deviations }, { data: signedDocs }] =
    await Promise.all([
      supabase
        .from("projects")
        .select(
          "id, project_number, title, status, scheduled_start_date, scheduled_end_date, customer:customers(name, map_color)",
        )
        .or(
          `and(scheduled_start_date.gte.${startStr},scheduled_start_date.lte.${endStr}),and(scheduled_end_date.gte.${startStr},scheduled_end_date.lte.${endStr})`,
        ),
      supabase
        .from("deviations")
        .select("id, project_id, title, severity, status, created_at")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", new Date(monthEnd.getTime() + 86399999).toISOString())
        .neq("status", "lukket"),
      supabase
        .from("documents")
        .select("id, project_id, kind, signed_at")
        .eq("status", "signert")
        .gte("signed_at", monthStart.toISOString())
        .lte("signed_at", new Date(monthEnd.getTime() + 86399999).toISOString()),
    ]);

  // Bygg events per dato (YYYY-MM-DD)
  const events: CalendarEvent[] = [];

  for (const p of scheduled ?? []) {
    const customer = (
      p as unknown as {
        customer?: { name: string; map_color: string | null } | null;
      }
    ).customer;
    if (p.scheduled_start_date) {
      events.push({
        date: p.scheduled_start_date,
        kind: "project_start",
        title: p.title,
        subtitle: `#${p.project_number}${customer ? ` · ${customer.name}` : ""}`,
        href: `/prosjekter/${p.id}?tab=planlegging`,
        color: customer?.map_color ?? null,
      });
    }
    if (
      p.scheduled_end_date &&
      p.scheduled_end_date !== p.scheduled_start_date
    ) {
      events.push({
        date: p.scheduled_end_date,
        kind: "project_end",
        title: p.title,
        subtitle: `#${p.project_number} — ${t("cal_event_due_suffix")}`,
        href: `/prosjekter/${p.id}?tab=planlegging`,
        color: customer?.map_color ?? null,
      });
    }
  }

  for (const d of deviations ?? []) {
    events.push({
      date: d.created_at.split("T")[0],
      kind: "deviation",
      title: d.title,
      subtitle: t("cal_event_deviation_label").replace("{sev}", d.severity),
      href: d.project_id
        ? `/prosjekter/${d.project_id}?tab=kvalitet#avvik`
        : "/avvik",
      color: null,
    });
  }

  for (const doc of signedDocs ?? []) {
    if (!doc.signed_at) continue;
    events.push({
      date: doc.signed_at.split("T")[0],
      kind: "doc_signed",
      title: kindLabelForLocale(doc.kind, locale),
      subtitle: t("cal_event_signed_label"),
      href: doc.project_id
        ? `/prosjekter/${doc.project_id}?tab=kvalitet`
        : "/skjemaer",
      color: null,
    });
  }

  const weekdayLabels: [string, string, string, string, string, string, string] = [
    t("cal_weekday_mon"),
    t("cal_weekday_tue"),
    t("cal_weekday_wed"),
    t("cal_weekday_thu"),
    t("cal_weekday_fri"),
    t("cal_weekday_sat"),
    t("cal_weekday_sun"),
  ];

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <CalendarIcon className="size-6 text-text-2" />
            {t("cal_title")}
          </h1>
          <p className="text-text-2 text-sm">{t("cal_subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/kalender?year=${prevYear}&month=${prevMonth}`}>
            <Button variant="secondary" size="sm">
              <ChevronLeft className="size-4" />
            </Button>
          </Link>
          <div className="px-3 text-sm font-medium min-w-[140px] text-center">
            {t(MONTH_KEYS[safeMonth - 1])} {safeYear}
          </div>
          <Link href={`/kalender?year=${nextYear}&month=${nextMonth}`}>
            <Button variant="secondary" size="sm">
              <ChevronRight className="size-4" />
            </Button>
          </Link>
          <Link
            href={`/kalender?year=${now.getFullYear()}&month=${now.getMonth() + 1}`}
            className="ml-2"
          >
            <Button size="sm">{t("cal_today")}</Button>
          </Link>
        </div>
      </header>

      <Card>
        <CardBody className="!p-0">
          <CalendarGrid
            year={safeYear}
            month={safeMonth}
            events={events}
            weekdayLabels={weekdayLabels}
            eventsCountTemplate={t("cal_events_count")}
            dateLocale={locale === "en" ? "en-GB" : "no-NO"}
          />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-text-3">
        <LegendItem color="bg-orange/80" label={t("cal_legend_start")} />
        <LegendItem color="bg-blue/80" label={t("cal_legend_end")} />
        <LegendItem color="bg-yellow/80" label={t("cal_legend_deviation")} />
        <LegendItem color="bg-green/80" label={t("cal_legend_signed")} />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-2.5 rounded-full ${color}`} />
      {label}
    </div>
  );
}

function kindLabelForLocale(
  kind: string,
  locale: "no" | "en",
): string {
  const map: Record<string, keyof typeof S> = {
    risikovurdering: "cal_kind_risk",
    sluttkontroll: "cal_kind_final",
    samsvarserklaering: "cal_kind_conformity",
    forenklet_sikkerhet: "cal_kind_simplified",
    sja: "cal_kind_sja",
    ruh: "cal_kind_ruh",
    startup_checklist: "cal_kind_startup_short",
    stikkprovekontroll: "cal_kind_sampling",
    internkontroll: "cal_kind_internal",
    custom: "cal_kind_custom",
  };
  const key = map[kind];
  return key ? S[key][locale] : kind;
}
