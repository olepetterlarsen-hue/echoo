import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  ShieldCheck,
  FileSignature,
  FileText,
  HardHat,
  Siren,
  Sunrise,
  ClipboardCheck,
  AlertTriangle,
  Plus,
  Pencil,
  FileDown,
  MapPin,
  Layers,
} from "lucide-react";
import type { DocumentKind } from "@/lib/types/database";
import {
  DOCUMENT_KIND_LABELS,
  PROJECT_STATUS_LABELS,
  INSTALLATION_TYPE_LABELS,
} from "@/lib/types/database";
import { DeviationsBlock } from "./deviations-block";
import { ProjectStatusSelect } from "./project-status-select";
import { ProjectTabBar } from "./tab-bar";
import { CommentsBlock } from "./comments-block";
import { AddToMapButton } from "./add-to-map-button";
import { getHiddenKinds } from "@/lib/document-templates";
import { MessageCircle, CheckSquare, Calendar as CalIcon } from "lucide-react";
import { TASK_STATUS_LABELS } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n";
import type { StringKey } from "@/lib/i18n/strings";

const STANDARD_KINDS: DocumentKind[] = [
  "risikovurdering",
  "sluttkontroll",
  "samsvarserklaering",
];

const KIND_ICONS: Record<DocumentKind, React.ReactNode> = {
  risikovurdering: <ShieldCheck className="size-5" />,
  sluttkontroll: <ClipboardList className="size-5" />,
  samsvarserklaering: <FileSignature className="size-5" />,
  forenklet_sikkerhet: <FileText className="size-5" />,
  sja: <HardHat className="size-5" />,
  ruh: <Siren className="size-5" />,
  startup_checklist: <Sunrise className="size-5" />,
  stikkprovekontroll: <ClipboardCheck className="size-5" />,
  internkontroll: <ShieldCheck className="size-5" />,
  custom: <FileText className="size-5" />,
};

const KIND_DESCRIPTION_KEYS: Record<DocumentKind, StringKey> = {
  risikovurdering: "proj_kind_desc_risikovurdering",
  sluttkontroll: "proj_kind_desc_sluttkontroll",
  samsvarserklaering: "proj_kind_desc_samsvarserklaering",
  forenklet_sikkerhet: "proj_kind_desc_forenklet_sikkerhet",
  sja: "proj_kind_desc_sja",
  ruh: "proj_kind_desc_ruh",
  startup_checklist: "proj_kind_desc_startup_checklist",
  stikkprovekontroll: "proj_kind_desc_stikkprovekontroll",
  internkontroll: "proj_kind_desc_internkontroll",
  custom: "proj_kind_desc_custom",
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab: "planlegging" | "kvalitet" =
    tab === "planlegging" ? "planlegging" : "kvalitet";

  const supabase = await createClient();
  const { t, locale } = await getServerT();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "*, customer:customers(id, name, contact_person, phone, email, map_color), site:sites(id, name, external_site_id, address, postal_code, city, latitude, longitude), stage:project_stages(id, name, color)",
    )
    .eq("id", id)
    .single();
  if (!project) notFound();

  type ProjectWithLinks = typeof project & {
    customer?: {
      id: string;
      name: string;
      contact_person: string | null;
      phone: string | null;
      email: string | null;
      map_color: string | null;
    } | null;
    site?: {
      id: string;
      name: string;
      external_site_id: string | null;
      address: string | null;
      postal_code: string | null;
      city: string | null;
      latitude: number | null;
      longitude: number | null;
    } | null;
    stage?: {
      id: string;
      name: string;
      color: string | null;
    } | null;
  };
  const p = project as ProjectWithLinks;

  // Hopper over JSONB-feltet "data" — det er stort (skjema-innhold) og
  // brukes ikke i listevisningen, kun når brukeren åpner ett dokument.
  const { data: documents } = await supabase
    .from("documents")
    .select("id, kind, version, status, pdf_path, signed_at")
    .eq("project_id", id)
    .order("version", { ascending: false });

  const hidden = await getHiddenKinds();

  // Egne (custom) maler brukeren har bygget — vises som egen seksjon på
  // prosjektkortet så man kan opprette dokumenter fra dem. Skjulte maler
  // filtreres bort (is_hidden = true).
  const { data: customTemplates } = await supabase
    .from("custom_templates")
    .select("id, name, subtitle, description, is_hidden")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false });

  const { data: deviations } = await supabase
    .from("deviations")
    .select(
      "*, reported_by_profile:profiles!deviations_reported_by_fkey(full_name), assigned_to_profile:profiles!deviations_assigned_to_fkey(full_name)",
    )
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  // Hent kommentarer + current user info for autorisasjon
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const { data: currentProfile } = currentUser
    ? await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single()
    : { data: null };

  const { data: rawComments } = await supabase
    .from("project_comments")
    .select(
      "id, body, created_at, author_id, author:profiles!project_comments_author_id_fkey(full_name, email)",
    )
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  type CommentRow = {
    id: string;
    body: string;
    created_at: string;
    author_id: string;
    author?: { full_name: string | null; email: string | null } | null;
  };
  const comments = (rawComments ?? []) as unknown as CommentRow[];

  // Tasks knyttet til prosjektet
  const { data: rawTasks } = await supabase
    .from("tasks")
    .select(
      "id, title, status, due_date, assigned_to, assignee:profiles!tasks_assigned_to_fkey(full_name, email), task_type:task_types(label_no)",
    )
    .eq("project_id", id)
    .order("status")
    .order("created_at", { ascending: false });

  type ProjectTaskRow = {
    id: string;
    title: string;
    status: "initiated" | "in_progress" | "resolved";
    due_date: string | null;
    assigned_to: string | null;
    assignee?: { full_name: string | null; email: string | null } | null;
    task_type?: { label_no: string } | null;
  };
  const projectTasks = (rawTasks ?? []) as unknown as ProjectTaskRow[];
  const openTasks = projectTasks.filter((t) => t.status !== "resolved");

  // Hent schedule entries for prosjektet (om det er plassert i produksjonsplanen)
  const { data: scheduleEntries } = await supabase
    .from("schedule_entries")
    .select(
      "id, title, start_date, end_date, status, locked, group:groups(name, color)",
    )
    .eq("project_id", id)
    .order("start_date");

  type ScheduleRow = {
    id: string;
    title: string | null;
    start_date: string;
    end_date: string;
    status: string;
    locked: boolean;
    group?: { name: string; color: string | null } | null;
  };
  const projectSchedule = (scheduleEntries ?? []) as unknown as ScheduleRow[];

  const docsByKind: Record<DocumentKind, DocVersion[]> = (
    documents ?? []
  ).reduce(
    (acc, d) => {
      const list = acc[d.kind] ?? [];
      list.push(d);
      acc[d.kind] = list;
      return acc;
    },
    {} as Record<DocumentKind, DocVersion[]>,
  );

  const openDeviations = (deviations ?? []).filter(
    (d) => d.status !== "lukket",
  ).length;

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/prosjekter"
              className="text-text-3 hover:text-text-1 text-sm"
            >
              {t("proj_back_to_list")}
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="text-text-2 text-sm font-mono">
            #{project.project_number}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProjectStatusSelect projectId={project.id} current={project.status} />
          <Link href={`/prosjekter/${project.id}/rediger`}>
            <Button variant="secondary" size="sm">
              <Pencil className="size-4" />
              {t("proj_edit")}
            </Button>
          </Link>
        </div>
      </header>

      <ProjectTabBar projectId={id} active={activeTab} />

      {activeTab === "planlegging" ? (
        <PlanningTab
          project={p}
          openDeviations={openDeviations}
          comments={comments}
          tasks={projectTasks}
          openTasksCount={openTasks.length}
          schedule={projectSchedule}
          currentUserId={currentUser?.id ?? ""}
          isAdmin={currentProfile?.role === "admin"}
          t={t}
          locale={locale}
        />
      ) : (
        <QualityTab
          project={p}
          docsByKind={docsByKind}
          hidden={hidden}
          customTemplates={customTemplates ?? []}
          deviations={(deviations ?? []) as unknown as Parameters<
            typeof DeviationsBlock
          >[0]["initial"]}
          t={t}
          locale={locale}
        />
      )}
    </div>
  );
}

type TFunc = (key: StringKey) => string;

// ─────────────────────────────────────────────────────────────────────────────
// PLANLEGGING-TAB
// ─────────────────────────────────────────────────────────────────────────────

function PlanningTab({
  project: p,
  openDeviations,
  comments,
  tasks,
  openTasksCount,
  schedule,
  currentUserId,
  isAdmin,
  t,
  locale,
}: {
  project: ProjectWithLinksParam;
  openDeviations: number;
  comments: Array<{
    id: string;
    body: string;
    created_at: string;
    author_id: string;
    author?: { full_name: string | null; email: string | null } | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: "initiated" | "in_progress" | "resolved";
    due_date: string | null;
    assignee?: { full_name: string | null; email: string | null } | null;
    task_type?: { label_no: string } | null;
  }>;
  openTasksCount: number;
  schedule: Array<{
    id: string;
    title: string | null;
    start_date: string;
    end_date: string;
    status: string;
    locked: boolean;
    group?: { name: string; color: string | null } | null;
  }>;
  currentUserId: string;
  isAdmin: boolean;
  t: TFunc;
  locale: Locale;
}) {
  const dateLocale = locale === "en" ? "en-GB" : "no-NO";
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Kunde */}
        <Card>
          <CardBody>
            <h3 className="text-xs uppercase tracking-wider text-text-3 mb-2">
              {t("proj_card_customer")}
            </h3>
            {p.customer ? (
              <>
                <Link
                  href={`/kunder/${p.customer.id}`}
                  className="font-medium hover:text-orange flex items-center gap-2"
                >
                  {p.customer.map_color && (
                    <span
                      className="inline-block size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.customer.map_color }}
                    />
                  )}
                  {p.customer.name}
                </Link>
                {p.customer.contact_person && (
                  <p className="text-sm text-text-2 mt-1">
                    {p.customer.contact_person}
                  </p>
                )}
                {p.customer.phone && (
                  <p className="text-sm text-text-2">{p.customer.phone}</p>
                )}
              </>
            ) : p.customer_name ? (
              <>
                <p className="font-medium">{p.customer_name}</p>
                {p.customer_contact && (
                  <p className="text-sm text-text-2">{p.customer_contact}</p>
                )}
                <p className="text-xs text-text-3 mt-2 italic">
                  {t("proj_not_linked_customer")}{" "}
                  <Link
                    href={`/prosjekter/${p.id}/rediger`}
                    className="text-orange hover:underline"
                  >
                    {t("proj_link_up")}
                  </Link>
                </p>
              </>
            ) : (
              <p className="text-text-3">–</p>
            )}
          </CardBody>
        </Card>

        {/* Site */}
        <Card>
          <CardBody>
            <h3 className="text-xs uppercase tracking-wider text-text-3 mb-2">
              {t("proj_card_site")}
            </h3>
            {p.site ? (
              <>
                <Link
                  href={`/sites/${p.site.id}`}
                  className="font-medium hover:text-orange"
                >
                  {p.site.name}
                </Link>
                {p.site.external_site_id && (
                  <p className="text-xs text-text-3 font-mono">
                    {p.site.external_site_id}
                  </p>
                )}
                {(p.site.address || p.site.city) && (
                  <p className="text-sm text-text-2 mt-1">
                    {[p.site.address, p.site.city].filter(Boolean).join(", ")}
                  </p>
                )}
                {p.site.latitude && p.site.longitude && (
                  <Link
                    href={`/kart`}
                    className="text-xs text-orange hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    <MapPin className="size-3" />
                    {t("proj_show_on_map")}
                  </Link>
                )}
              </>
            ) : p.site_address ? (
              <>
                <p className="font-medium">{p.site_address}</p>
                {(p.site_postal_code || p.site_city) && (
                  <p className="text-sm text-text-2">
                    {p.site_postal_code} {p.site_city}
                  </p>
                )}
                <div className="mt-2">
                  <AddToMapButton projectId={p.id} />
                </div>
                <p className="text-xs text-text-3 mt-2 italic">
                  {t("proj_not_linked_site")}{" "}
                  <Link
                    href={`/prosjekter/${p.id}/rediger`}
                    className="text-orange hover:underline"
                  >
                    {t("proj_link_up")}
                  </Link>
                </p>
              </>
            ) : (
              <p className="text-text-3">–</p>
            )}
          </CardBody>
        </Card>

        {/* Status + Stage */}
        <Card>
          <CardBody>
            <h3 className="text-xs uppercase tracking-wider text-text-3 mb-2">
              {t("proj_card_status")}
            </h3>
            <Badge
              tone={
                p.status === "aktiv"
                  ? "green"
                  : p.status === "ferdigstilt"
                    ? "blue"
                    : p.status === "paa_vent"
                      ? "yellow"
                      : "neutral"
              }
            >
              {PROJECT_STATUS_LABELS[p.status][locale]}
            </Badge>
            {p.stage && (
              <p className="text-xs text-text-3 mt-2 flex items-center gap-1.5">
                <Layers className="size-3" />
                <span>{t("proj_kanban_phase")}</span>
                <span
                  className="inline-flex items-center gap-1 text-text-2"
                  style={p.stage.color ? { color: p.stage.color } : undefined}
                >
                  {p.stage.color && (
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: p.stage.color }}
                    />
                  )}
                  {p.stage.name}
                </span>
              </p>
            )}
            {p.installation_type && (
              <p className="text-xs text-text-3 mt-2">
                {t("proj_installation_type_label")}{" "}
                <span className="text-text-2">
                  {INSTALLATION_TYPE_LABELS[p.installation_type][locale]}
                </span>
              </p>
            )}
            <p className="text-xs text-text-3 mt-2">
              {t("proj_updated")} {new Date(p.updated_at).toLocaleDateString(dateLocale)}
            </p>
          </CardBody>
        </Card>
      </div>

      {p.description && (
        <Card>
          <CardBody>
            <h3 className="text-xs uppercase tracking-wider text-text-3 mb-2">
              {t("proj_card_description")}
            </h3>
            <p className="text-sm whitespace-pre-wrap">{p.description}</p>
          </CardBody>
        </Card>
      )}

      {/* Produksjonsplan-status */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalIcon className="size-4 text-orange" />
            {t("proj_production_plan")}
            <Badge tone={schedule.length > 0 ? "orange" : "neutral"}>
              {schedule.length === 0
                ? t("proj_not_planned")
                : t("proj_n_assignments").replace("{n}", String(schedule.length))}
            </Badge>
          </CardTitle>
          <Link href={`/produksjonsplan/ny?project=${p.id}`}>
            <Button size="sm">
              <Plus className="size-4" />
              {t("proj_place_in_plan")}
            </Button>
          </Link>
        </CardHeader>
        <CardBody>
          {schedule.length === 0 ? (
            <p className="text-sm text-text-3">
              {t("proj_production_plan_empty_prefix")}{" "}
              <Link
                href={`/produksjonsplan/ny?project=${p.id}`}
                className="text-orange hover:underline"
              >
                {t("proj_place_it_now")}
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {schedule.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 bg-card border border-border rounded"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {s.group?.color && (
                      <span
                        className="inline-block size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.group.color }}
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-1 truncate">
                        {s.title || p.title}
                        {s.locked && <span className="ml-1.5">🔒</span>}
                      </div>
                      <div className="text-xs text-text-3">
                        {new Date(s.start_date).toLocaleDateString(dateLocale, {
                          day: "numeric",
                          month: "short",
                        })}
                        {" – "}
                        {new Date(s.end_date).toLocaleDateString(dateLocale, {
                          day: "numeric",
                          month: "short",
                        })}
                        {s.group && (
                          <span className="ml-2 text-text-2">· {s.group.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    tone={
                      s.status === "done"
                        ? "green"
                        : s.status === "in_progress"
                          ? "blue"
                          : s.status === "revisit"
                            ? "red"
                            : "yellow"
                    }
                  >
                    {s.status === "done"
                      ? t("proj_schedule_done")
                      : s.status === "in_progress"
                        ? t("proj_schedule_in_progress")
                        : s.status === "revisit"
                          ? t("proj_schedule_revisit")
                          : t("proj_schedule_planned")}
                  </Badge>
                </li>
              ))}
              <li>
                <Link
                  href="/produksjonsplan"
                  className="text-xs text-text-3 hover:text-orange flex justify-center pt-1"
                >
                  {t("proj_view_in_gantt")}
                </Link>
              </li>
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Oppgaver på prosjektet */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="size-4 text-orange" />
            {t("proj_tasks")}
            <Badge tone={openTasksCount > 0 ? "orange" : "neutral"}>
              {t("proj_n_open").replace("{n}", String(openTasksCount))}
            </Badge>
          </CardTitle>
          <Link href={`/oppgaver/ny?project=${p.id}`}>
            <Button size="sm">
              <Plus className="size-4" />
              {t("proj_new_task")}
            </Button>
          </Link>
        </CardHeader>
        <CardBody className="!p-0">
          {tasks.length === 0 ? (
            <p className="px-5 py-4 text-sm text-text-3">
              {t("proj_tasks_empty_prefix")}{" "}
              <Link
                href={`/oppgaver/ny?project=${p.id}`}
                className="text-orange hover:underline"
              >
                {t("proj_create_first_task")}
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {tasks.slice(0, 8).map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/oppgaver/${task.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-card-hover"
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm truncate ${
                          task.status === "resolved"
                            ? "text-text-3 line-through"
                            : "text-text-1 font-medium"
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="text-xs text-text-3 truncate">
                        {task.task_type?.label_no && (
                          <>
                            {task.task_type.label_no}
                            {(task.assignee || task.due_date) && " · "}
                          </>
                        )}
                        {task.assignee
                          ? task.assignee.full_name || task.assignee.email
                          : t("proj_no_assignee")}
                        {task.due_date && (
                          <>
                            {(task.task_type?.label_no || task.assignee) && " · "}
                            {t("proj_task_due_prefix")}{" "}
                            {new Date(task.due_date).toLocaleDateString(dateLocale, {
                              day: "2-digit",
                              month: "short",
                            })}
                          </>
                        )}
                      </div>
                    </div>
                    <Badge
                      tone={
                        task.status === "resolved"
                          ? "green"
                          : task.status === "in_progress"
                            ? "blue"
                            : "yellow"
                      }
                    >
                      {TASK_STATUS_LABELS[task.status][locale]}
                    </Badge>
                  </Link>
                </li>
              ))}
              {tasks.length > 8 && (
                <li>
                  <Link
                    href={`/oppgaver?view=alle`}
                    className="block px-5 py-2 text-xs text-text-3 hover:text-text-1 text-center"
                  >
                    {t("proj_see_all_n_tasks").replace("{n}", String(tasks.length))}
                  </Link>
                </li>
              )}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Avvik-snutt (kompakt) */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-yellow" />
            {t("proj_deviations")}
            <Badge tone={openDeviations > 0 ? "yellow" : "neutral"}>
              {t("proj_n_open").replace("{n}", String(openDeviations))}
            </Badge>
          </CardTitle>
          <Link
            href={`/prosjekter/${p.id}?tab=kvalitet#avvik`}
            className="text-xs text-text-2 hover:text-orange"
          >
            {t("proj_see_under_quality")}
          </Link>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-text-2">
            {t("proj_deviations_help_prefix")}{" "}
            <Link
              href={`/prosjekter/${p.id}?tab=kvalitet`}
              className="text-orange hover:underline"
            >
              {t("proj_quality_tab_link")}
            </Link>
            .
          </p>
        </CardBody>
      </Card>

      {/* Kommentar-tråd */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="size-4 text-text-2" />
            {t("proj_communication")}
            <Badge tone="neutral">{comments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardBody>
          <CommentsBlock
            projectId={p.id}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            initial={comments}
          />
        </CardBody>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KVALITET-TAB
// ─────────────────────────────────────────────────────────────────────────────

function QualityTab({
  project: p,
  docsByKind,
  hidden,
  customTemplates,
  deviations,
  t,
  locale,
}: {
  project: ProjectWithLinksParam;
  docsByKind: Record<DocumentKind, DocVersion[]>;
  hidden: Set<DocumentKind>;
  customTemplates: Array<{
    id: string;
    name: string;
    subtitle: string | null;
    description: string | null;
    is_hidden: boolean;
  }>;
  deviations: Parameters<typeof DeviationsBlock>[0]["initial"];
  t: TFunc;
  locale: Locale;
}) {
  return (
    <>
      <section>
        <h2 className="text-lg font-semibold mb-1">
          {t("proj_section_standard")}{" "}
          <span className="text-text-3 text-sm">
            {t("proj_n_documents").replace("{n}", "3")}
          </span>
        </h2>
        <p className="text-sm text-text-3 mb-3">{t("proj_standard_help")}</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {STANDARD_KINDS.filter((k) => !hidden.has(k)).map((kind) => (
            <DocumentCard
              key={kind}
              kind={kind}
              versions={docsByKind[kind] ?? []}
              projectId={p.id}
              t={t}
              locale={locale}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">
          {t("proj_section_simplified")}{" "}
          <span className="text-text-3 text-sm">
            {t("proj_n_document").replace("{n}", "1")}
          </span>
        </h2>
        <p className="text-sm text-text-3 mb-3">{t("proj_simplified_help")}</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {!hidden.has("forenklet_sikkerhet") && (
            <DocumentCard
              kind="forenklet_sikkerhet"
              versions={docsByKind["forenklet_sikkerhet"] ?? []}
              projectId={p.id}
              t={t}
              locale={locale}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">{t("proj_section_sja")}</h2>
        <p className="text-sm text-text-3 mb-3">{t("proj_sja_help")}</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {!hidden.has("sja") && (
            <DocumentCard
              kind="sja"
              versions={docsByKind["sja"] ?? []}
              projectId={p.id}
              t={t}
              locale={locale}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">{t("proj_section_hms")}</h2>
        <p className="text-sm text-text-3 mb-3">{t("proj_hms_help")}</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(["ruh", "startup_checklist", "stikkprovekontroll"] as const)
            .filter((k) => !hidden.has(k))
            .map((kind) => (
              <DocumentCard
                key={kind}
                kind={kind}
                versions={docsByKind[kind] ?? []}
                projectId={p.id}
                t={t}
                locale={locale}
              />
            ))}
        </div>
      </section>

      {customTemplates.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-1">
            {t("proj_section_custom")}{" "}
            <span className="text-text-3 text-sm">
              {t("proj_n_documents").replace(
                "{n}",
                String(customTemplates.length),
              )}
            </span>
          </h2>
          <p className="text-sm text-text-3 mb-3">
            {t("proj_custom_help")}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {customTemplates.map((tpl) => (
              <CustomTemplateCard
                key={tpl.id}
                template={tpl}
                projectId={p.id}
              />
            ))}
          </div>
        </section>
      )}

      <section id="avvik">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="size-5 text-yellow" />
            {t("proj_deviations")}
          </h2>
          <span className="text-sm text-text-3">
            {t("proj_n_open").replace(
              "{n}",
              String(deviations.filter((d) => d.status !== "lukket").length),
            )}
          </span>
        </div>
        <DeviationsBlock projectId={p.id} initial={deviations} />
      </section>
    </>
  );
}

// Kort som viser en av brukerens custom-maler. Klikk går til
// /prosjekter/[id]/dokumenter/custom?v={template_id} som spawn'er
// standard document-editor med custom-mal-innholdet.
function CustomTemplateCard({
  template,
  projectId,
}: {
  template: { id: string; name: string; subtitle: string | null };
  projectId: string;
}) {
  return (
    <Link
      href={`/prosjekter/${projectId}/dokumenter/custom?v=${template.id}`}
      className="block border border-border rounded-lg p-4 hover:border-orange/40 hover:bg-card-hover transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 grid place-items-center size-9 rounded-md bg-orange/10 text-orange">
          <ClipboardList className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-text-1 truncate">
            {template.name}
          </div>
          {template.subtitle && (
            <div className="text-xs text-text-3 mt-0.5 line-clamp-2">
              {template.subtitle}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FELLES TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ProjectWithLinksParam = {
  id: string;
  title: string;
  project_number: string;
  description: string | null;
  status: "aktiv" | "ferdigstilt" | "paa_vent" | "arkivert";
  installation_type: "bolig" | "naering" | "telecom" | "ev" | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_contact: string | null;
  site_address: string | null;
  site_postal_code: string | null;
  site_city: string | null;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    map_color: string | null;
  } | null;
  site?: {
    id: string;
    name: string;
    external_site_id: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  stage?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
};

interface DocVersion {
  id: string;
  version: number;
  status: "utkast" | "under_review" | "approved" | "rejected" | "signert";
  pdf_path: string | null;
  signed_at: string | null;
}

function DocumentCard({
  kind,
  versions,
  projectId,
  t,
  locale,
}: {
  kind: DocumentKind;
  versions: DocVersion[];
  projectId: string;
  t: TFunc;
  locale: Locale;
}) {
  const latest = versions[0];
  const labels = DOCUMENT_KIND_LABELS[kind];
  const dateLocale = locale === "en" ? "en-GB" : "no-NO";

  return (
    <Card>
      <CardHeader className="flex items-start gap-3">
        <span className="text-text-2 mt-0.5">{KIND_ICONS[kind]}</span>
        <div className="flex-1">
          <CardTitle>{labels[locale]}</CardTitle>
          <p className="text-xs text-text-3 mt-1">{t(KIND_DESCRIPTION_KEYS[kind])}</p>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        {latest ? (
          <>
            <div className="flex items-center justify-between">
              <Badge tone={latest.status === "signert" ? "green" : "yellow"}>
                v{latest.version} ·{" "}
                {latest.status === "signert" ? t("proj_doc_signed") : t("proj_doc_draft")}
              </Badge>
              {latest.signed_at && (
                <span className="text-xs text-text-3">
                  {new Date(latest.signed_at).toLocaleDateString(dateLocale)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/prosjekter/${projectId}/dokumenter/${kind}`}
                className="flex-1"
              >
                <Button variant="secondary" size="sm" className="w-full">
                  {latest.status === "signert" ? t("proj_doc_view") : t("proj_doc_edit")}
                </Button>
              </Link>
              {latest.status === "signert" && latest.pdf_path && (
                <Link
                  href={`/api/documents/${latest.id}/pdf`}
                  target="_blank"
                >
                  <Button size="sm">
                    <FileDown className="size-4" />
                    PDF
                  </Button>
                </Link>
              )}
            </div>
            {versions.length > 1 && (
              <details className="text-xs">
                <summary className="text-text-3 cursor-pointer hover:text-text-1">
                  {t("proj_doc_version_history").replace("{n}", String(versions.length))}
                </summary>
                <ul className="mt-2 space-y-1">
                  {versions.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between text-text-2 py-1"
                    >
                      <span>
                        v{v.version} ·{" "}
                        {v.status === "signert" ? t("proj_doc_signed") : t("proj_doc_draft")}
                      </span>
                      {v.pdf_path && (
                        <Link
                          href={`/api/documents/${v.id}/pdf`}
                          target="_blank"
                          className="text-orange hover:underline"
                        >
                          PDF
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        ) : (
          <Link href={`/prosjekter/${projectId}/dokumenter/${kind}`}>
            <Button size="sm" className="w-full">
              <Plus className="size-4" />
              {t("proj_doc_create")}
            </Button>
          </Link>
        )}
      </CardBody>
    </Card>
  );
}
