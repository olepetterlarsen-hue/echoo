"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { upsertScheduleEntry } from "../actions";

interface Props {
  projects: Array<{ id: string; project_number: string; title: string }>;
  groups: Array<{ id: string; name: string; color: string | null }>;
  defaultProjectId?: string;
}

export function NewScheduleForm({
  projects,
  groups,
  defaultProjectId,
}: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const STATUS_OPTIONS = [
    { value: "planned", label: tr("gantt_status_planned", locale) },
    { value: "in_progress", label: tr("gantt_status_in_progress", locale) },
    { value: "done", label: tr("gantt_status_done", locale) },
    { value: "revisit", label: tr("gantt_status_revisit", locale) },
  ];

  // Brukes som default-verdier til state-en under — capture én gang via
  // useState-initializer så Date.now() ikke kalles på hver render.
  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    const inOneWeek = new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .split("T")[0];
    return {
      project_id: defaultProjectId ?? "",
      group_id: "",
      title: "",
      start_date: today,
      end_date: inOneWeek,
      status: "planned",
      locked: false,
      locked_reason: "",
      notes: "",
    };
  });

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await upsertScheduleEntry({
        project_id: form.project_id || undefined,
        group_id: form.group_id || undefined,
        title: form.title || undefined,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
        locked: form.locked,
        locked_reason: form.locked ? form.locked_reason : undefined,
        notes: form.notes || undefined,
      });
      if (res.error) setError(res.error);
      else router.push("/produksjonsplan");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("sched_card_linking", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field
            label={tr("sched_field_project", locale)}
            hint={tr("sched_project_hint_card", locale)}
          >
            <select
              value={form.project_id}
              onChange={(e) => update("project_id", e.target.value)}
              className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            >
              <option value="">{tr("sched_opt_oneoff", locale)}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} (#{p.project_number})
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("sched_field_team_swimlane", locale)}>
            <select
              value={form.group_id}
              onChange={(e) => update("group_id", e.target.value)}
              className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            >
              <option value="">{tr("sched_opt_no_group", locale)}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={tr("sched_field_title_optional", locale)}
            hint={tr("sched_title_hint", locale)}
          >
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder={tr("sched_title_placeholder", locale)}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("sched_card_period_status", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={tr("sched_field_from_date", locale)} required>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => update("start_date", e.target.value)}
                required
              />
            </Field>
            <Field label={tr("sched_field_to_date", locale)} required>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => update("end_date", e.target.value)}
                required
              />
            </Field>
          </div>
          <Field label={tr("task_field_status", locale)}>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={form.locked}
              onChange={(e) => update("locked", e.target.checked)}
              className="size-4 accent-orange"
            />
            <span className="text-sm">{tr("sched_lock_dates_label", locale)}</span>
          </label>
          {form.locked && (
            <Field label={tr("sched_lock_reason_long", locale)} required>
              <Input
                value={form.locked_reason}
                onChange={(e) => update("locked_reason", e.target.value)}
                placeholder={tr("sched_lock_placeholder_kunde", locale)}
                required
              />
            </Field>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("sched_card_notes", locale)}</CardTitle>
        </CardHeader>
        <CardBody>
          <Field label={tr("sched_field_notes_optional", locale)}>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
            />
          </Field>
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
          {pending
            ? tr("task_saving", locale)
            : tr("sched_place_on_calendar", locale)}
        </Button>
      </div>
    </form>
  );
}
