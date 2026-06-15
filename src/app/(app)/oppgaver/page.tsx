import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckSquare, ListChecks, LayoutGrid, Tag } from "lucide-react";
import { TaskStatusToggle } from "./status-toggle";
import { TASK_STATUS_LABELS } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n";

interface PageProps {
  searchParams: Promise<{ view?: string; status?: string }>;
}

export default async function TasksPage({ searchParams }: PageProps) {
  const { t, locale } = await getServerT();
  const { view: viewParam, status } = await searchParams;
  const view = viewParam === "alle" || viewParam === "tavle" ? viewParam : "mine";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("tasks")
    .select(
      "id, title, description, task_type_slug, status, assigned_to, group_id, due_date, reported_by, resolved_at, created_at, project_id, projects(project_number, title), assignee:profiles!tasks_assigned_to_fkey(full_name, email), task_type:task_types(label_no)",
    )
    .order("created_at", { ascending: false });

  if (view === "mine") {
    query = query.eq("assigned_to", user.id);
  }
  if (status && status !== "all" && (status === "initiated" || status === "in_progress" || status === "resolved")) {
    query = query.eq("status", status);
  } else if (view !== "tavle") {
    // Mine og Alle: skjul "resolved" by default
    query = query.neq("status", "resolved");
  }

  const { data: rawTasks } = await query;

  type TaskRow = {
    id: string;
    title: string;
    description: string | null;
    task_type_slug: string | null;
    status: "initiated" | "in_progress" | "resolved";
    assigned_to: string | null;
    group_id: string | null;
    due_date: string | null;
    reported_by: string;
    resolved_at: string | null;
    created_at: string;
    project_id: string | null;
    projects?: { project_number: string; title: string } | null;
    assignee?: { full_name: string | null; email: string | null } | null;
    task_type?: { label_no: string } | null;
  };
  const tasks = (rawTasks ?? []) as unknown as TaskRow[];

  // Kun for "mine"-fanen: vis stats
  const stats = { open: 0, resolved: 0, avgResolveDays: 0 };
  if (view === "mine") {
    const { data: allMine } = await supabase
      .from("tasks")
      .select("status, created_at, resolved_at")
      .eq("assigned_to", user.id);
    const all = (allMine ?? []) as Array<{
      status: string;
      created_at: string;
      resolved_at: string | null;
    }>;
    stats.open = all.filter((t) => t.status !== "resolved").length;
    stats.resolved = all.filter((t) => t.status === "resolved").length;
    const resolvedDurations = all
      .filter((t) => t.status === "resolved" && t.resolved_at)
      .map(
        (t) =>
          (new Date(t.resolved_at!).getTime() -
            new Date(t.created_at).getTime()) /
          86400000,
      );
    stats.avgResolveDays =
      resolvedDurations.length > 0
        ? Math.round(
            (resolvedDurations.reduce((a, b) => a + b, 0) /
              resolvedDurations.length) *
              10,
          ) / 10
        : 0;
  }

  const dateLocale = locale === "en" ? "en-GB" : "no-NO";
  const daysSuffix = locale === "en" ? "d" : "d";

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <CheckSquare className="size-6 text-text-2" />
            {t("task_list_title")}
          </h1>
          <p className="text-text-2 text-sm">{t("task_list_subtitle")}</p>
        </div>
        <Link href="/oppgaver/ny">
          <Button>
            <Plus className="size-4" />
            {t("task_new")}
          </Button>
        </Link>
      </header>

      {/* Tabs */}
      <div className="border-b border-border -mx-6 px-6">
        <nav className="flex gap-1">
          <TabLink
            href="/oppgaver?view=mine"
            active={view === "mine"}
            icon={<CheckSquare className="size-4" />}
            label={t("task_tab_mine")}
          />
          <TabLink
            href="/oppgaver?view=alle"
            active={view === "alle"}
            icon={<ListChecks className="size-4" />}
            label={t("task_tab_all")}
          />
          <TabLink
            href="/oppgaver?view=tavle"
            active={view === "tavle"}
            icon={<LayoutGrid className="size-4" />}
            label={t("task_tab_board")}
          />
          <TabLink
            href="/oppgaver/typer"
            active={false}
            icon={<Tag className="size-4" />}
            label={t("task_tab_types")}
          />
        </nav>
      </div>

      {/* Mine-stats */}
      {view === "mine" && (
        <div className="grid grid-cols-3 gap-4">
          <StatPill label={t("task_stat_open")} value={stats.open} tone="orange" />
          <StatPill label={t("task_stat_completed")} value={stats.resolved} tone="green" />
          <StatPill
            label={t("task_stat_avg_resolve")}
            value={stats.avgResolveDays > 0 ? `${stats.avgResolveDays} ${daysSuffix}` : "—"}
          />
        </div>
      )}

      {/* Liste / tavle */}
      {view === "tavle" ? (
        <TaskBoard tasks={tasks} locale={locale} emptyLabel={t("task_board_empty")} columnLabels={{
          initiated: TASK_STATUS_LABELS.initiated[locale],
          in_progress: TASK_STATUS_LABELS.in_progress[locale],
          resolved: TASK_STATUS_LABELS.resolved[locale],
        }} noneLabel={t("task_assignee_none")} />
      ) : (
        <Card>
          <CardBody className="!p-0">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-text-3 text-sm">
                <CheckSquare className="size-8 mx-auto mb-2 opacity-40" />
                {view === "mine" ? t("task_empty_mine") : t("task_empty_all")}{" "}
                <Link
                  href="/oppgaver/ny"
                  className="text-orange hover:underline"
                >
                  {t("task_empty_create_link")}
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface text-text-3 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">{t("task_col_title")}</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">
                      {t("task_col_type")}
                    </th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">
                      {t("task_col_project")}
                    </th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">
                      {t("task_col_assigned")}
                    </th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">
                      {t("task_col_due")}
                    </th>
                    <th className="text-left px-4 py-3">{t("task_col_status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-card-hover">
                      <td className="px-4 py-3">
                        <Link
                          href={`/oppgaver/${task.id}`}
                          className="font-medium text-text-1 hover:text-orange"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-text-2">
                        {task.task_type?.label_no ?? "–"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {task.projects ? (
                          <Link
                            href={`/prosjekter/${task.project_id}?tab=planlegging`}
                            className="text-text-2 hover:text-orange truncate inline-block max-w-[200px]"
                          >
                            {task.projects.title}
                          </Link>
                        ) : (
                          <span className="text-text-3">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-text-2">
                        {task.assignee?.full_name ||
                          task.assignee?.email ||
                          (task.group_id ? t("task_assignee_group") : "—")}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {task.due_date ? (
                          <DueDateBadge date={task.due_date} dateLocale={dateLocale} />
                        ) : (
                          <span className="text-text-3 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <TaskStatusToggle taskId={task.id} current={task.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "orange" | "green";
}) {
  const toneClass =
    tone === "orange"
      ? "text-orange"
      : tone === "green"
        ? "text-green"
        : "text-text-1";
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wider text-text-3 mb-1">
          {label}
        </div>
        <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
      </CardBody>
    </Card>
  );
}

function TabLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-orange text-orange"
          : "border-transparent text-text-2 hover:text-text-1"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function DueDateBadge({ date, dateLocale }: { date: string; dateLocale: string }) {
  const due = new Date(date);
  const now = new Date();
  const days = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  const tone: "red" | "orange" | "yellow" | "neutral" =
    days < 0 ? "red" : days < 3 ? "orange" : days < 7 ? "yellow" : "neutral";
  return (
    <Badge tone={tone}>
      {due.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" })}
    </Badge>
  );
}

function TaskBoard({
  tasks,
  locale,
  emptyLabel,
  columnLabels,
  noneLabel,
}: {
  tasks: Array<{
    id: string;
    title: string;
    status: "initiated" | "in_progress" | "resolved";
    assignee?: { full_name: string | null; email: string | null } | null;
    due_date: string | null;
    projects?: { project_number: string; title: string } | null;
    project_id: string | null;
  }>;
  locale: Locale;
  emptyLabel: string;
  columnLabels: Record<"initiated" | "in_progress" | "resolved", string>;
  noneLabel: string;
}) {
  const dateLocale = locale === "en" ? "en-GB" : "no-NO";
  const columns: Array<{
    key: "initiated" | "in_progress" | "resolved";
    label: string;
  }> = [
    { key: "initiated", label: columnLabels.initiated },
    { key: "in_progress", label: columnLabels.in_progress },
    { key: "resolved", label: columnLabels.resolved },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div key={col.key} className="space-y-2">
            <div className="px-2 flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider text-text-3 font-semibold">
                {col.label}
              </h3>
              <Badge tone="neutral">{colTasks.length}</Badge>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {colTasks.length === 0 ? (
                <div className="text-xs text-text-3 text-center py-6">
                  {emptyLabel}
                </div>
              ) : (
                colTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/oppgaver/${task.id}`}
                    className="block bg-surface border border-border rounded-md p-3 text-sm hover:border-orange/40 transition-colors"
                  >
                    <div className="font-medium text-text-1">{task.title}</div>
                    {task.projects && (
                      <div className="text-xs text-text-3 mt-1 truncate">
                        {task.projects.title}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-xs text-text-2 truncate">
                        {task.assignee?.full_name ||
                          task.assignee?.email ||
                          noneLabel}
                      </span>
                      {task.due_date && (
                        <DueDateBadge date={task.due_date} dateLocale={dateLocale} />
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
