import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { TaskStatusToggle } from "../status-toggle";
import { TaskDeleteButton } from "./delete-button";
import { TASK_STATUS_LABELS } from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { t, locale } = await getServerT();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: task } = await supabase
    .from("tasks")
    .select(
      "*, projects(id, project_number, title), assignee:profiles!tasks_assigned_to_fkey(id, full_name, email), reporter:profiles!tasks_reported_by_fkey(id, full_name, email), task_type:task_types(label_no), group:groups(id, name)",
    )
    .eq("id", id)
    .single();
  if (!task) notFound();

  type TaskFull = typeof task & {
    projects?: { id: string; project_number: string; title: string } | null;
    assignee?: {
      id: string;
      full_name: string | null;
      email: string | null;
    } | null;
    reporter?: {
      id: string;
      full_name: string | null;
      email: string | null;
    } | null;
    task_type?: { label_no: string } | null;
    group?: { id: string; name: string } | null;
  };
  const taskData = task as TaskFull;

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const canEdit =
    me?.role === "admin" ||
    taskData.reported_by === user.id ||
    taskData.assigned_to === user.id;

  const dateLocale = locale === "en" ? "en-GB" : "no-NO";

  // Interne app-lenker i beskrivelsen (f.eks. signeringsforespørsler legger
  // dokument-stien på egen linje) vises som en tydelig knapp i stedet.
  const rawDescription = taskData.description ?? "";
  const pathMatch = rawDescription.match(
    /(?:^|\n)(\/(?:prosjekter|skjemaer)\/\S+)\s*$/,
  );
  const documentPath = pathMatch?.[1] ?? null;
  const descriptionText = documentPath
    ? rawDescription.replace(pathMatch![0], "").trimEnd()
    : rawDescription;

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/oppgaver"
            className="text-text-3 hover:text-text-1 text-sm"
          >
            {t("task_back_to_list")}
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{taskData.title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-text-2">
            {taskData.task_type && (
              <Badge tone="neutral">{taskData.task_type.label_no}</Badge>
            )}
            <Badge
              tone={
                taskData.status === "resolved"
                  ? "green"
                  : taskData.status === "in_progress"
                    ? "blue"
                    : "yellow"
              }
            >
              {TASK_STATUS_LABELS[taskData.status][locale]}
            </Badge>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <TaskStatusToggle taskId={taskData.id} current={taskData.status} />
            <Link href={`/oppgaver/${taskData.id}/rediger`}>
              <Button variant="secondary" size="sm">
                <Pencil className="size-4" />
                {t("edit")}
              </Button>
            </Link>
            <TaskDeleteButton taskId={taskData.id} taskTitle={taskData.title} />
          </div>
        )}
      </header>

      {(descriptionText || documentPath) && (
        <Card>
          <CardBody className="space-y-3">
            {descriptionText && (
              <>
                <h3 className="text-xs uppercase tracking-wider text-text-3 mb-2">
                  {t("task_label_description")}
                </h3>
                <p className="text-sm whitespace-pre-wrap">{descriptionText}</p>
              </>
            )}
            {documentPath && (
              <Link href={documentPath} className="block sm:inline-block">
                <Button className="w-full sm:w-auto min-h-11">
                  {t("task_open_document")}
                </Button>
              </Link>
            )}
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("task_card_assignment")}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <p>
              <span className="text-text-3">{t("task_label_person")}</span>{" "}
              {taskData.assignee?.full_name || taskData.assignee?.email || (
                <span className="text-text-3">—</span>
              )}
            </p>
            <p>
              <span className="text-text-3">{t("task_label_group")}</span>{" "}
              {taskData.group?.name || <span className="text-text-3">—</span>}
            </p>
            <p>
              <span className="text-text-3">{t("task_label_created_by")}</span>{" "}
              {taskData.reporter?.full_name ||
                taskData.reporter?.email ||
                t("unknown")}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("task_card_details")}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            {taskData.projects ? (
              <p>
                <span className="text-text-3">{t("task_label_project")}</span>{" "}
                <Link
                  href={`/prosjekter/${taskData.projects.id}?tab=planlegging`}
                  className="text-orange hover:underline"
                >
                  {taskData.projects.title} (#{taskData.projects.project_number})
                </Link>
              </p>
            ) : (
              <p>
                <span className="text-text-3">{t("task_label_project")}</span>{" "}
                <span className="text-text-3">{t("task_value_standalone")}</span>
              </p>
            )}
            {taskData.due_date && (
              <p>
                <span className="text-text-3">{t("task_label_due_colon")}</span>{" "}
                {new Date(taskData.due_date).toLocaleDateString(dateLocale)}
              </p>
            )}
            <p>
              <span className="text-text-3">{t("task_label_created")}</span>{" "}
              {new Date(taskData.created_at).toLocaleString(dateLocale, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {taskData.resolved_at && (
              <p>
                <span className="text-text-3">{t("task_label_resolved")}</span>{" "}
                {new Date(taskData.resolved_at).toLocaleDateString(dateLocale)}
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
