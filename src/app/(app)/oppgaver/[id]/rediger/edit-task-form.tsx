"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TaskStatus } from "@/lib/types/database";
import { TASK_STATUS_LABELS } from "@/lib/types/database";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { updateTask } from "../../actions";

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type_slug: string | null;
  status: TaskStatus;
  project_id: string | null;
  assigned_to: string | null;
  group_id: string | null;
  due_date: string | null;
}

interface Props {
  task: Task;
  projects: Array<{ id: string; project_number: string; title: string }>;
  profiles: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
  }>;
  groups: Array<{ id: string; name: string }>;
  taskTypes: Array<{ slug: string; label_no: string }>;
}

export function EditTaskForm({
  task,
  projects,
  profiles,
  groups,
  taskTypes,
}: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? "",
    task_type_slug: task.task_type_slug ?? "",
    status: task.status,
    project_id: task.project_id ?? "",
    assigned_to: task.assigned_to ?? "",
    group_id: task.group_id ?? "",
    due_date: task.due_date ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateTask({
        id: task.id,
        title: form.title,
        description: form.description,
        task_type_slug: form.task_type_slug || null,
        status: form.status,
        project_id: form.project_id || null,
        assigned_to: form.assigned_to || null,
        group_id: form.group_id || null,
        due_date: form.due_date || null,
      });
      if (res.error) setError(res.error);
      else router.push(`/oppgaver/${task.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("task_card_task", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("task_field_title", locale)} required>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
            />
          </Field>
          <Field label={tr("task_field_description", locale)}>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={4}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label={tr("task_field_type", locale)}>
              <select
                value={form.task_type_slug}
                onChange={(e) => update("task_type_slug", e.target.value)}
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("task_opt_no_type", locale)}</option>
                {taskTypes.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.label_no}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr("task_field_status", locale)}>
              <select
                value={form.status}
                onChange={(e) =>
                  update("status", e.target.value as TaskStatus)
                }
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                {(["initiated", "in_progress", "resolved"] as TaskStatus[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {TASK_STATUS_LABELS[s][locale]}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label={tr("task_field_due", locale)}>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => update("due_date", e.target.value)}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("task_card_linking", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("task_field_project", locale)}>
            <select
              value={form.project_id}
              onChange={(e) => update("project_id", e.target.value)}
              className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            >
              <option value="">{tr("task_opt_standalone", locale)}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} (#{p.project_number})
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={tr("task_field_assigned_person", locale)}>
              <select
                value={form.assigned_to}
                onChange={(e) => update("assigned_to", e.target.value)}
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("task_opt_none_or_group", locale)}</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr("task_field_assigned_group", locale)}>
              <select
                value={form.group_id}
                onChange={(e) => update("group_id", e.target.value)}
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("task_opt_no_group", locale)}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </CardBody>
      </Card>

      {error && (
        <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {tr("cancel", locale)}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? tr("task_saving", locale) : tr("task_save_changes", locale)}
        </Button>
      </div>
    </form>
  );
}
