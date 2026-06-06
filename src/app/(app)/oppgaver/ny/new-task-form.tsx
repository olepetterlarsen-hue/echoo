"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { createTask } from "../actions";

interface Props {
  projects: Array<{ id: string; project_number: string; title: string }>;
  profiles: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
  }>;
  groups: Array<{ id: string; name: string }>;
  taskTypes: Array<{ slug: string; label_no: string }>;
  defaultProjectId?: string;
}

export function NewTaskForm({
  projects,
  profiles,
  groups,
  taskTypes,
  defaultProjectId,
}: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    task_type_slug: "",
    project_id: defaultProjectId ?? "",
    assigned_to: "",
    group_id: "",
    due_date: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTask({
        title: form.title,
        description: form.description,
        task_type_slug: form.task_type_slug || undefined,
        project_id: form.project_id || undefined,
        assigned_to: form.assigned_to || undefined,
        group_id: form.group_id || undefined,
        due_date: form.due_date || undefined,
      });
      if (res.error) setError(res.error);
      else if (res.id) router.push(`/oppgaver/${res.id}`);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Field label={tr("task_field_due_optional", locale)}>
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
          <Field label={tr("task_field_project_optional", locale)}>
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
            <Field label={tr("task_field_or_assigned_group", locale)}>
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
          <p className="text-xs text-text-3">{tr("task_group_hint", locale)}</p>
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
          {pending ? tr("task_creating", locale) : tr("task_create_btn", locale)}
        </Button>
      </div>
    </form>
  );
}
