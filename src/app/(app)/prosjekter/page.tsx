import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { PROJECT_PHASE_LABELS, type ProjectPhase } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; phase?: string }>;
}

const PHASE_TONE: Record<ProjectPhase, "neutral" | "orange" | "blue" | "green" | "red" | "yellow"> = {
  bidding: "yellow",
  production: "orange",
  completed: "green",
  lost: "red",
  cancelled: "neutral",
};

export default async function ProjectsPage({ searchParams }: PageProps) {
  const { q, status, phase } = await searchParams;
  const supabase = await createClient();
  const { t, locale } = await getServerT();

  const STATUS_LABEL_KEYS: Record<string, "proj_status_aktiv" | "proj_status_paa_vent" | "proj_status_ferdigstilt" | "proj_status_arkivert"> = {
    aktiv: "proj_status_aktiv",
    paa_vent: "proj_status_paa_vent",
    ferdigstilt: "proj_status_ferdigstilt",
    arkivert: "proj_status_arkivert",
  };

  let query = supabase
    .from("projects")
    .select(
      "id, project_number, title, customer_name, status, phase, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (status) query = query.eq("status", status as never);
  if (phase) query = query.eq("phase", phase as never);
  if (q) {
    query = query.or(
      `title.ilike.%${q}%,project_number.ilike.%${q}%,customer_name.ilike.%${q}%`,
    );
  }

  const { data: projects } = await query;

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("proj_title")}</h1>
          <p className="text-text-2 text-sm">{t("proj_subtitle")}</p>
        </div>
        <Link href="/prosjekter/ny">
          <Button>
            <Plus className="size-4" />
            {t("proj_new")}
          </Button>
        </Link>
      </header>

      <form className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("proj_search_placeholder")}
            className="w-full h-10 rounded-md pl-9 pr-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
          />
        </div>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
        >
          <option value="">{t("proj_all_statuses")}</option>
          <option value="aktiv">{t("proj_status_aktiv")}</option>
          <option value="paa_vent">{t("proj_status_paa_vent")}</option>
          <option value="ferdigstilt">{t("proj_status_ferdigstilt")}</option>
          <option value="arkivert">{t("proj_status_arkivert")}</option>
        </select>
        <select
          name="phase"
          defaultValue={phase ?? ""}
          className="h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
        >
          <option value="">{t("proj_all_phases")}</option>
          {(["bidding", "production", "completed", "lost", "cancelled"] as ProjectPhase[]).map((p) => (
            <option key={p} value={p}>
              {PROJECT_PHASE_LABELS[p][locale]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          {t("proj_filter")}
        </Button>
      </form>

      {/* Mobil: kort-liste — hele kortet er trykkbart, ingen sidescroll */}
      <div className="sm:hidden space-y-2">
        {projects?.map((p) => (
          <Link
            key={p.id}
            href={`/prosjekter/${p.id}`}
            className="block bg-card border border-border rounded-lg p-3 active:bg-card-hover"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-orange text-sm">
                {p.project_number}
              </span>
              <span className="text-[11px] text-text-3">
                {new Date(p.updated_at).toLocaleDateString(
                  locale === "en" ? "en-GB" : "no-NO",
                )}
              </span>
            </div>
            <div className="text-base text-text-1 mt-0.5 truncate">
              {p.title}
            </div>
            {p.customer_name && (
              <div className="text-xs text-text-3 truncate">
                {p.customer_name}
              </div>
            )}
            <div className="flex gap-1.5 mt-2">
              <Badge tone={PHASE_TONE[p.phase as ProjectPhase] ?? "neutral"}>
                {PROJECT_PHASE_LABELS[p.phase as ProjectPhase]?.[locale] ?? p.phase}
              </Badge>
              <Badge
                tone={
                  p.status === "aktiv"
                    ? "green"
                    : p.status === "paa_vent"
                    ? "yellow"
                    : p.status === "ferdigstilt"
                    ? "blue"
                    : "neutral"
                }
              >
                {STATUS_LABEL_KEYS[p.status] ? t(STATUS_LABEL_KEYS[p.status]) : p.status}
              </Badge>
            </div>
          </Link>
        ))}
        {(!projects || projects.length === 0) && (
          <p className="bg-card border border-border rounded-lg p-6 text-center text-text-3 text-sm">
            {t("proj_empty")}{" "}
            <Link href="/prosjekter/ny" className="text-orange hover:underline">
              {t("proj_create_one")}
            </Link>
            .
          </p>
        )}
      </div>

      <div className="hidden sm:block bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-3 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">{t("proj_col_number")}</th>
              <th className="text-left px-4 py-3">{t("proj_col_title")}</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">{t("proj_col_customer")}</th>
              <th className="text-left px-4 py-3">{t("proj_col_phase")}</th>
              <th className="text-left px-4 py-3">{t("proj_col_status")}</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">{t("proj_col_updated")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {projects?.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-card-hover cursor-pointer"
                onClick={undefined}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/prosjekter/${p.id}`}
                    className="text-orange hover:underline font-mono"
                  >
                    {p.project_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/prosjekter/${p.id}`} className="hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-text-2">
                  {p.customer_name ?? "–"}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={PHASE_TONE[p.phase as ProjectPhase] ?? "neutral"}>
                    {PROJECT_PHASE_LABELS[p.phase as ProjectPhase]?.[locale] ?? p.phase}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    tone={
                      p.status === "aktiv"
                        ? "green"
                        : p.status === "paa_vent"
                        ? "yellow"
                        : p.status === "ferdigstilt"
                        ? "blue"
                        : "neutral"
                    }
                  >
                    {STATUS_LABEL_KEYS[p.status] ? t(STATUS_LABEL_KEYS[p.status]) : p.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-text-3 text-xs">
                  {new Date(p.updated_at).toLocaleDateString(locale === "en" ? "en-GB" : "no-NO")}
                </td>
              </tr>
            ))}
            {(!projects || projects.length === 0) && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-text-3">
                  {t("proj_empty")} <Link href="/prosjekter/ny" className="text-orange hover:underline">{t("proj_create_one")}</Link>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
