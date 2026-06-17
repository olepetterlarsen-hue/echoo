import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getServerT } from "@/lib/i18n/server";
import {
  FolderOpen,
  AlertTriangle,
  FileCheck,
  ClipboardList,
  Building2,
  MapPin,
  Briefcase,
  ShieldCheck,
  Kanban,
  CheckSquare,
  GraduationCap,
  Plus,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { t } = await getServerT();
  const { data: { user } } = await supabase.auth.getUser();
  // RLS scopes data til current org, men eksplisitt org-filter på hver
  // query er defense in depth — gjør det åpenbart i kode at vi aldri
  // viser andre orgs data, og hjelper kveruerings-planleggeren.
  const orgId = await getCurrentOrgId(supabase);

  const [
    { count: activeProjects },
    { count: customerCount },
    { count: siteCount },
    { count: openDeviations },
    { count: draftDocs },
    { data: recentProjects },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "aktiv"),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("active", true),
    supabase
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("active", true),
    supabase
      .from("deviations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .neq("status", "lukket"),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "utkast"),
    supabase
      .from("projects")
      .select("id, project_number, title, status, updated_at")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 86400000)
    .toISOString()
    .split("T")[0];

  const [
    myDeviations,
    { count: myDraftsCount },
    { count: myAssignedCount },
    { count: expiringCertsCount },
  ] = user
    ? await Promise.all([
        supabase
          .from("deviations")
          .select("id, title, severity, status, project_id")
          .eq("organization_id", orgId)
          .eq("assigned_to", user.id)
          .neq("status", "lukket")
          .limit(5),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("created_by", user.id)
          .eq("status", "utkast"),
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("assigned_to", user.id)
          .neq("status", "ferdigstilt"),
        supabase
          .from("certificates")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("profile_id", user.id)
          .not("expires_date", "is", null)
          .lte("expires_date", in90Days),
      ])
    : [
        { data: [] },
        { count: 0 },
        { count: 0 },
        { count: 0 },
      ];

  const myDeviationsCount = myDeviations.data?.length ?? 0;
  const myTaskTotal =
    myDeviationsCount +
    (myDraftsCount ?? 0) +
    (myAssignedCount ?? 0) +
    (expiringCertsCount ?? 0);

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{t("dash_title")}</h1>
        <p className="text-text-2 text-sm">{t("dash_subtitle")}</p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Briefcase className="size-4 text-text-2" />
          <h2 className="text-xs uppercase tracking-wider text-text-3 font-semibold">
            {t("nav_section_planning")}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FolderOpen className="size-5" />}
            label={t("dash_active_projects")}
            value={activeProjects ?? 0}
            href="/prosjekter"
            addHref="/prosjekter/ny"
            addTitle="Opprett nytt prosjekt"
          />
          <StatCard
            icon={<Kanban className="size-5" />}
            label={t("dash_kanban_board")}
            value={t("dash_kanban_open")}
            href="/kanban"
          />
          <StatCard
            icon={<Building2 className="size-5" />}
            label={t("nav_customers")}
            value={customerCount ?? 0}
            href="/kunder"
            addHref="/kunder/ny"
            addTitle="Opprett ny kunde"
          />
          <StatCard
            icon={<MapPin className="size-5" />}
            label={t("nav_sites")}
            value={siteCount ?? 0}
            href="/sites"
            addHref="/sites/ny"
            addTitle="Opprett nytt anlegg"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-text-2" />
          <h2 className="text-xs uppercase tracking-wider text-text-3 font-semibold">
            {t("nav_section_quality")}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<AlertTriangle className="size-5" />}
            label={t("dash_open_deviations")}
            value={openDeviations ?? 0}
            href="/avvik"
            addHref="/avvik/ny"
            addTitle="Meld nytt avvik"
            tone={openDeviations && openDeviations > 0 ? "yellow" : "neutral"}
          />
          <StatCard
            icon={<ClipboardList className="size-5" />}
            label={t("dash_document_drafts")}
            value={draftDocs ?? 0}
            href="/skjemaer"
            addHref="/skjemaer"
            addTitle="Nytt dokument-utkast"
          />
          <StatCard
            icon={<FileCheck className="size-5" />}
            label={t("dash_my_competence")}
            value={t("see_overview")}
            href="/kompetanse"
            addHref="/kompetanse"
            addTitle="Last opp kursbevis"
          />
          <StatCard
            icon={<ShieldCheck className="size-5" />}
            label={t("nav_skjemaer")}
            value={t("dash_forms_standalone")}
            href="/skjemaer"
          />
        </div>
      </section>

      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <CheckSquare className="size-5 text-text-2" />
            {t("dash_my_tasks_title")}
            {myTaskTotal > 0 && (
              <Badge tone="orange">{myTaskTotal}</Badge>
            )}
          </h2>
          <div className="flex items-center gap-3">
            <Link
              href="/oppgaver/ny"
              title="Opprett ny oppgave"
              aria-label="Opprett ny oppgave"
              className="size-7 grid place-items-center rounded-md bg-orange/15 text-orange hover:bg-orange hover:text-bg transition-colors"
            >
              <Plus className="size-4" />
            </Link>
            <Link
              href="/mine-oppgaver"
              className="text-xs text-orange hover:underline"
            >
              {t("see_full_list")} →
            </Link>
          </div>
        </div>
        <CardBody>
          {myTaskTotal === 0 ? (
            <p className="text-sm text-text-3 text-center py-3">
              {t("dash_my_tasks_empty")}
            </p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MyTaskCount
                label={t("dash_tile_deviations")}
                count={myDeviationsCount}
                icon={<AlertTriangle className="size-4" />}
                href="/mine-oppgaver"
                tone={myDeviationsCount > 0 ? "yellow" : "neutral"}
              />
              <MyTaskCount
                label={t("dash_tile_drafts")}
                count={myDraftsCount ?? 0}
                icon={<ClipboardList className="size-4" />}
                href="/mine-oppgaver"
                tone={(myDraftsCount ?? 0) > 0 ? "yellow" : "neutral"}
              />
              <MyTaskCount
                label={t("dash_tile_projects")}
                count={myAssignedCount ?? 0}
                icon={<FolderOpen className="size-4" />}
                href="/mine-oppgaver"
                tone={(myAssignedCount ?? 0) > 0 ? "orange" : "neutral"}
              />
              <MyTaskCount
                label={t("dash_tile_certs_expiring")}
                count={expiringCertsCount ?? 0}
                icon={<GraduationCap className="size-4" />}
                href="/mine-oppgaver"
                tone={(expiringCertsCount ?? 0) > 0 ? "red" : "neutral"}
              />
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("dash_recent_projects")}</h2>
            <div className="flex items-center gap-3">
              <Link
                href="/prosjekter/ny"
                title="Opprett nytt prosjekt"
                aria-label="Opprett nytt prosjekt"
                className="size-7 grid place-items-center rounded-md bg-orange/15 text-orange hover:bg-orange hover:text-bg transition-colors"
              >
                <Plus className="size-4" />
              </Link>
              <Link
                href="/prosjekter"
                className="text-xs text-orange hover:underline"
              >
                {t("see_all")} →
              </Link>
            </div>
          </div>
          <CardBody className="!p-0">
            {recentProjects && recentProjects.length > 0 ? (
              <ul className="divide-y divide-border">
                {recentProjects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/prosjekter/${p.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-card-hover"
                    >
                      <div>
                        <div className="font-medium text-text-1">{p.title}</div>
                        <div className="text-xs text-text-3">
                          #{p.project_number}
                        </div>
                      </div>
                      <Badge tone={p.status === "aktiv" ? "green" : "neutral"}>
                        {p.status}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-text-3 text-sm">
                {t("dash_no_projects")}{" "}
                <Link
                  href="/prosjekter/ny"
                  className="text-orange hover:underline"
                >
                  {t("dash_create_one")}
                </Link>
                .
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("dash_my_open_deviations")}</h2>
            <div className="flex items-center gap-3">
              <Link
                href="/avvik/ny"
                title="Meld nytt avvik"
                aria-label="Meld nytt avvik"
                className="size-7 grid place-items-center rounded-md bg-orange/15 text-orange hover:bg-orange hover:text-bg transition-colors"
              >
                <Plus className="size-4" />
              </Link>
              <Link
                href="/mine-oppgaver"
                className="text-xs text-orange hover:underline"
              >
                {t("dash_my_all")} →
              </Link>
            </div>
          </div>
          <CardBody className="!p-0">
            {myDeviations.data && myDeviations.data.length > 0 ? (
              <ul className="divide-y divide-border">
                {myDeviations.data.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/prosjekter/${d.project_id}?tab=kvalitet#avvik`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-card-hover"
                    >
                      <span className="text-text-1 text-sm">{d.title}</span>
                      <Badge
                        tone={
                          d.severity === "kritisk"
                            ? "red"
                            : d.severity === "hoey"
                              ? "orange"
                              : "yellow"
                        }
                      >
                        {d.severity}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-text-3 text-sm">
                {t("dash_no_open_deviations_assigned")}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function MyTaskCount({
  label,
  count,
  icon,
  href,
  tone,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  href: string;
  tone: "neutral" | "yellow" | "orange" | "red";
}) {
  const toneClass =
    tone === "red"
      ? "text-red"
      : tone === "orange"
        ? "text-orange"
        : tone === "yellow"
          ? "text-yellow"
          : "text-text-3";
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-md hover:bg-card-hover transition-colors"
    >
      <div className="flex items-center gap-2 text-xs text-text-3 mb-1">
        <span className={toneClass}>{icon}</span>
        {label}
      </div>
      <div className={`text-xl font-semibold ${count > 0 ? toneClass : "text-text-2"}`}>
        {count}
      </div>
    </Link>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  addHref,
  addTitle,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  href: string;
  addHref?: string;
  addTitle?: string;
  tone?: "neutral" | "orange" | "yellow";
}) {
  const toneClass =
    tone === "orange"
      ? "text-orange"
      : tone === "yellow"
        ? "text-yellow"
        : "text-text-2";
  return (
    <div className="bg-card hover:bg-card-hover border border-border rounded-lg p-5 transition-colors relative group">
      <Link href={href} className="absolute inset-0 z-0" aria-label={label} />
      <div className="relative z-10 flex items-center justify-between pointer-events-none">
        <span className="text-text-2 text-xs uppercase tracking-wider">
          {label}
        </span>
        <span className={toneClass}>{icon}</span>
      </div>
      <div className="relative z-10 text-2xl font-semibold mt-2 pointer-events-none">
        {value}
      </div>
      {addHref && (
        <Link
          href={addHref}
          title={addTitle ?? "Opprett ny"}
          aria-label={addTitle ?? "Opprett ny"}
          className="absolute bottom-2 right-2 z-20 size-7 grid place-items-center rounded-md bg-orange/15 text-orange hover:bg-orange hover:text-bg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Plus className="size-4" />
        </Link>
      )}
    </div>
  );
}
