"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { Plane, X } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { upsertOffPeriod } from "./off-actions";

interface Props {
  groups: Array<{ id: string; name: string; color: string | null }>;
}

export function OffPeriodDialog({ groups }: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const REASON_OPTIONS = [
    { value: "vacation", label: tr("sched_reason_vacation", locale) },
    { value: "sick", label: tr("sched_reason_sick", locale) },
    { value: "holiday", label: tr("sched_reason_holiday", locale) },
    { value: "other", label: tr("sched_reason_other", locale) },
  ];

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    group_id: "",
    start_date: today,
    end_date: today,
    reason: "vacation",
    notes: "",
    locked: false,
    locked_reason: "",
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
      const res = await upsertOffPeriod({
        group_id: form.group_id || undefined,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
        notes: form.notes || undefined,
        locked: form.locked,
        locked_reason: form.locked ? form.locked_reason : undefined,
      });
      if (res.error) setError(res.error);
      else {
        setOpen(false);
        setForm({
          group_id: "",
          start_date: today,
          end_date: today,
          reason: "vacation",
          notes: "",
          locked: false,
          locked_reason: "",
        });
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plane className="size-4" />
        {tr("sched_add_off", locale)}
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Plane className="size-5 text-yellow" />
              {tr("sched_add_off_title", locale)}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-text-3 hover:text-text-1"
              aria-label={tr("sched_close", locale)}
            >
              <X className="size-5" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field
              label={tr("sched_field_team", locale)}
              hint={tr("sched_team_hint_all", locale)}
            >
              <select
                value={form.group_id}
                onChange={(e) => update("group_id", e.target.value)}
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("sched_opt_all_teams", locale)}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={tr("sched_field_type", locale)}>
              <select
                value={form.reason}
                onChange={(e) => update("reason", e.target.value)}
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                {REASON_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
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

            <Field label={tr("sched_field_notes_optional", locale)}>
              <Textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={2}
              />
            </Field>

            <label className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={form.locked}
                onChange={(e) => update("locked", e.target.checked)}
                className="size-4 accent-orange"
              />
              <span className="text-sm">{tr("sched_lock_period_label", locale)}</span>
            </label>
            {form.locked && (
              <Field label={tr("sched_lock_reason_long", locale)} required>
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

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                {tr("cancel", locale)}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? tr("task_saving", locale) : tr("sched_add", locale)}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
