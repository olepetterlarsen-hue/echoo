import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  FileText,
  GraduationCap,
  FolderOpen,
  CheckCircle2,
  CheckSquare,
  Plus,
} from "lucide-react";
import { TASK_STATUS_LABELS } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

export default async function MyTasksPage() {
  const { t, locale } = await getServerT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 86400000)
    .toISOString()
    .split("T")[0];

  const [
    { data: myTasks },
    { data: myDeviations },
    { data: myDrafts },
    { data: expiringCerts },
    { data: myAssignedProjects },
  ] = await Promise.all([
    // Åpne oppgaver tildelt meg
    supabase
      .from("tasks")
      .select(
        "id, title, status, due_date, project_id, projects(project_number, title), task_type:task_types(label_no)",
      )
      .eq("assigned_to", user.id)
      .neq("status", "resolved")
      .order("due_date", { nullsFirst: false }),
    // Avvik tildelt meg
    supabase
      .from("deviations")
      .select(
        "id, title, severity, status, project_id, created_at, projects(project_number, title)",
      )
      .eq("assigned_to", user.id)
      .neq("status", "lukket")
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false }),
    // Mine dokumentutkast
    supabase
      .from("documents")
      .select(
        "id, kind, project_id, updated_at, projects(project_number, title)",
      )
      .eq("created_by", user.id)
      .eq("status", "utkast")
      .order("updated_at", { ascending: false }),
    // Kursbevis som utløper innen 90 dager
    supabase
      .from("certificates")
      .select("id, name, expires_date")
      .eq("profile_id", user.id)
      .not("expires_date", "is", null)
      .lte("expires_date", in90Days)
      .order("expires_date"),
    // Prosjekter jeg er tildelt
    supabase
      .from("projects")
      .select(
        "id, project_number, title, status, scheduled_start_date, scheduled_end_date",
      )
      .eq("assigned_to", user.id)
      .neq("status", "ferdigstilt")
      .order("scheduled_start_date", { nullsFirst: false }),
  ]);

  const totalTasks =
    (myTasks?.length ?? 0) +
    (myDeviations?.length ?? 0) +
    (myDrafts?.length ?? 0) +
    (expiringCerts?.length ?? 0) +
    (myAssignedProjects?.length ?? 0);

  const dateLocale = locale === "en" ? "en-GB" : "no-NO";

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{t("task_my_title")}</h1>
          <p className="text-text-2 text-sm">
            {totalTasks === 0
              ? t("task_my_nothing_subtitle")
              : t("task_my_count_subtitle").replace("{n}", String(totalTasks))}
          </p>
        </div>
        <Link
          href="/oppgaver/ny"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-orange text-bg font-medium text-sm hover:bg-orange/90"
        >
          <Plus className="size-4" />
          {t("task_new")}
        </Link>
      </header>

      {totalTasks === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <CheckCircle2 className="size-12 mx-auto mb-3 text-green opacity-60" />
            <p className="text-text-2">{t("task_my_all_clear")}</p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* TASKS */}
          {myTasks && myTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="size-4 text-orange" />
                  {t("task_my_assigned_tasks").replace(
                    "{n}",
                    String(myTasks.length),
                  )}
                </CardTitle>
              </CardHeader>
              <CardBody className="!p-0">
                <ul className="divide-y divide-border">
                  {myTasks.map((task) => {
                    const proj = (
                      task as unknown as {
                        projects?: {
                          project_number: string;
                          title: string;
                        } | null;
                      }
                    ).projects;
                    const type = (
                      task as unknown as {
                        task_type?: { label_no: string } | null;
                      }
                    ).task_type;
                    const status = task.status as
                      | "initiated"
                      | "in_progress"
                      | "resolved";
                    return (
                      <li key={task.id}>
                        <Link
                          href={`/oppgaver/${task.id}`}
                          className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-card-hover"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-text-1 truncate">
                              {task.title}
                            </div>
                            <div className="text-xs text-text-3 truncate">
                              {type?.label_no && (
                                <>
                                  {type.label_no}
                                  {proj && " · "}
                                </>
                              )}
                              {proj && (
                                <>
                                  {proj.title}{" "}
                                  <span className="font-mono">
                                    #{proj.project_number}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {task.due_date && (
                              <span className="text-xs text-text-3">
                                {t("task_due_label")}{" "}
                                {new Date(task.due_date).toLocaleDateString(
                                  dateLocale,
                                  { day: "2-digit", month: "short" },
                                )}
                              </span>
                            )}
                            <Badge
                              tone={
                                status === "in_progress" ? "blue" : "yellow"
                              }
                            >
                              {TASK_STATUS_LABELS[status][locale]}
                            </Badge>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          )}

          {/* AVVIK */}
          {myDeviations && myDeviations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-yellow" />
                  {t("task_my_assigned_deviations").replace(
                    "{n}",
                    String(myDeviations.length),
                  )}
                </CardTitle>
              </CardHeader>
              <CardBody className="!p-0">
                <ul className="divide-y divide-border">
                  {myDeviations.map((d) => {
                    const proj = (
                      d as unknown as {
                        projects?: {
                          project_number: string;
                          title: string;
                        } | null;
                      }
                    ).projects;
                    return (
                      <li key={d.id}>
                        <Link
                          href={
                            d.project_id
                              ? `/prosjekter/${d.project_id}?tab=kvalitet#avvik`
                              : "/avvik"
                          }
                          className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-card-hover"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-text-1 truncate">
                              {d.title}
                            </div>
                            {proj && (
                              <div className="text-xs text-text-3 truncate">
                                {proj.title}{" "}
                                <span className="font-mono">
                                  #{proj.project_number}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
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
                            <Badge tone="neutral">{d.status}</Badge>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          )}

          {/* DOKUMENTUTKAST */}
          {myDrafts && myDrafts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4 text-text-2" />
                  {t("task_my_drafts").replace("{n}", String(myDrafts.length))}
                </CardTitle>
              </CardHeader>
              <CardBody className="!p-0">
                <ul className="divide-y divide-border">
                  {myDrafts.map((d) => {
                    const proj = (
                      d as unknown as {
                        projects?: {
                          project_number: string;
                          title: string;
                        } | null;
                      }
                    ).projects;
                    const kindLabel = kindLabelFor(d.kind, t);
                    return (
                      <li key={d.id}>
                        <Link
                          href={
                            d.project_id
                              ? `/prosjekter/${d.project_id}/dokumenter/${d.kind}`
                              : `/skjemaer`
                          }
                          className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-card-hover"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-text-1 truncate">
                              {kindLabel}
                            </div>
                            {proj && (
                              <div className="text-xs text-text-3 truncate">
                                {proj.title}{" "}
                                <span className="font-mono">
                                  #{proj.project_number}
                                </span>
                              </div>
                            )}
                          </div>
                          <Badge tone="yellow">{t("draft")}</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          )}

          {/* PROSJEKTER TILDELT MEG */}
          {myAssignedProjects && myAssignedProjects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="size-4 text-text-2" />
                  {t("task_my_assigned_projects").replace(
                    "{n}",
                    String(myAssignedProjects.length),
                  )}
                </CardTitle>
              </CardHeader>
              <CardBody className="!p-0">
                <ul className="divide-y divide-border">
                  {myAssignedProjects.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/prosjekter/${p.id}?tab=planlegging`}
                        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-card-hover"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-text-1 truncate">
                            {p.title}
                          </div>
                          <div className="text-xs text-text-3 font-mono">
                            #{p.project_number}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.scheduled_end_date && (
                            <span className="text-xs text-text-3">
                              {t("task_due_label")}{" "}
                              {new Date(
                                p.scheduled_end_date,
                              ).toLocaleDateString(dateLocale)}
                            </span>
                          )}
                          <Badge
                            tone={p.status === "aktiv" ? "green" : "neutral"}
                          >
                            {p.status}
                          </Badge>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {/* UTLØPENDE KURSBEVIS */}
          {expiringCerts && expiringCerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="size-4 text-yellow" />
                  {t("task_my_expiring_certs").replace(
                    "{n}",
                    String(expiringCerts.length),
                  )}
                </CardTitle>
              </CardHeader>
              <CardBody className="!p-0">
                <ul className="divide-y divide-border">
                  {expiringCerts.map((c) => {
                    const days = c.expires_date
                      ? Math.ceil(
                          (new Date(c.expires_date).getTime() - now.getTime()) /
                            86400000,
                        )
                      : null;
                    return (
                      <li key={c.id}>
                        <Link
                          href="/kompetanse"
                          className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-card-hover"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-text-1 truncate">
                              {c.name}
                            </div>
                            {c.expires_date && (
                              <div className="text-xs text-text-3">
                                {t("task_expires_label")}{" "}
                                {new Date(c.expires_date).toLocaleDateString(
                                  dateLocale,
                                )}
                              </div>
                            )}
                          </div>
                          {days !== null && (
                            <Badge
                              tone={
                                days < 0 ? "red" : days < 30 ? "orange" : "yellow"
                              }
                            >
                              {days < 0
                                ? t("task_days_ago").replace(
                                    "{n}",
                                    String(Math.abs(days)),
                                  )
                                : t("task_days_left").replace(
                                    "{n}",
                                    String(days),
                                  )}
                            </Badge>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function kindLabelFor(
  kind: string,
  t: (key: Parameters<Awaited<ReturnType<typeof getServerT>>["t"]>[0]) => string,
): string {
  switch (kind) {
    case "risikovurdering":
      return t("cal_kind_risk");
    case "sluttkontroll":
      return t("cal_kind_final");
    case "samsvarserklaering":
      return t("cal_kind_conformity");
    case "forenklet_sikkerhet":
      return t("cal_kind_simplified");
    case "sja":
      return t("cal_kind_sja");
    case "ruh":
      return t("cal_kind_ruh");
    case "startup_checklist":
      return t("cal_kind_startup");
    case "stikkprovekontroll":
      return t("cal_kind_sampling");
    case "internkontroll":
      return t("cal_kind_internal");
    case "custom":
      return t("cal_kind_custom");
    default:
      return kind;
  }
}
