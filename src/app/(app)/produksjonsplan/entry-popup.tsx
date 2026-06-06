"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { X, ExternalLink, Trash2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import {
  upsertScheduleEntry,
  deleteScheduleEntry,
} from "./actions";

interface Entry {
  id: string;
  project_id: string | null;
  group_id: string | null;
  title: string | null;
  start_date: string;
  end_date: string;
  status: string;
  locked: boolean;
  locked_reason: string | null;
  projects?: {
    project_number: string;
    title: string;
  } | null;
}

interface Props {
  entry: Entry;
  projects: Array<{ id: string; project_number: string; title: string }>;
  groups: Array<{ id: string; name: string; color: string | null }>;
  onClose: () => void;
}

export function EntryPopup({ entry, projects, groups, onClose }: Props) {
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

  const [form, setForm] = useState({
    project_id: entry.project_id ?? "",
    group_id: entry.group_id ?? "",
    title: entry.title ?? "",
    start_date: entry.start_date,
    end_date: entry.end_date,
    status: entry.status,
    locked: entry.locked,
    locked_reason: entry.locked_reason ?? "",
  });

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await upsertScheduleEntry({
        id: entry.id,
        project_id: form.project_id || null,
        group_id: form.group_id || null,
        title: form.title || null,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
        locked: form.locked,
        locked_reason: form.locked ? form.locked_reason : null,
      });
      if (res.error) setError(res.error);
      else {
        onClose();
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!confirm(tr("sched_delete_confirm", locale))) return;
    startTransition(async () => {
      const res = await deleteScheduleEntry({ id: entry.id });
      if (res.error) setError(res.error);
      else {
        onClose();
        router.refresh();
      }
    });
  }

  const selectedProject = projects.find((p) => p.id === form.project_id);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {form.locked && <span>🔒</span>}
              {tr("sched_edit_job", locale)}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-text-3 hover:text-text-1"
              aria-label={tr("sched_close", locale)}
            >
              <X className="size-5" />
            </button>
          </div>

          <form onSubmit={onSave} className="space-y-4">
            <Field
              label={tr("sched_field_project", locale)}
              hint={
                selectedProject
                  ? tr("sched_project_hint_open", locale)
                  : tr("sched_project_hint_oneoff", locale)
              }
            >
              <div className="flex gap-2">
                <select
                  value={form.project_id}
                  onChange={(e) => update("project_id", e.target.value)}
                  className="flex-1 h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
                >
                  <option value="">{tr("sched_opt_no_project", locale)}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (#{p.project_number})
                    </option>
                  ))}
                </select>
                {selectedProject && (
                  <Link
                    href={`/prosjekter/${selectedProject.id}?tab=planlegging`}
                    target="_blank"
                    title={tr("sched_open_project", locale)}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-surface border border-border hover:bg-card-hover"
                  >
                    <ExternalLink className="size-4" />
                  </Link>
                )}
              </div>
            </Field>

            <Field label={tr("sched_field_team_swimlane", locale)}>
              <select
                value={form.group_id}
                onChange={(e) => update("group_id", e.target.value)}
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("sched_opt_no_team", locale)}</option>
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
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="text-xs font-medium text-text-2 uppercase tracking-wider mb-2 block">
                {tr("sched_field_status_override", locale)}
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => update("status", s.value)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                      form.status === s.value
                        ? "bg-orange/15 text-orange border-orange"
                        : "bg-card border-border text-text-2 hover:bg-card-hover"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={form.locked}
                onChange={(e) => update("locked", e.target.checked)}
                className="size-4 accent-orange"
              />
              <span className="text-sm">{tr("sched_lock_label", locale)}</span>
            </label>
            {form.locked && (
              <Field label={tr("sched_field_lock_reason", locale)} required>
                <Input
                  value={form.locked_reason}
                  onChange={(e) => update("locked_reason", e.target.value)}
                  placeholder={tr("sched_lock_placeholder", locale)}
                  required
                />
              </Field>
            )}

            {error && (
              <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-between gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={onDelete}
                disabled={pending}
                size="sm"
                className="text-red hover:bg-red/10"
              >
                <Trash2 className="size-4" />
                {tr("delete", locale)}
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  size="sm"
                >
                  {tr("cancel", locale)}
                </Button>
                <Button type="submit" disabled={pending} size="sm">
                  {pending ? tr("task_saving", locale) : tr("save", locale)}
                </Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
