"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import type { ProjectPhase } from "@/lib/types/database";
import { PROJECT_PHASE_LABELS } from "@/lib/types/database";
import { upsertTemplate, deleteTemplate } from "./actions";

interface Props {
  mode: "create" | "edit";
  template?: {
    id: string;
    name: string;
    description: string | null;
    default_category_id: string | null;
    default_phase: ProjectPhase | null;
    default_installation_type: string | null;
    default_description: string | null;
    default_assigned_to: string | null;
    default_stage_id: string | null;
    order_index: number;
    is_active: boolean;
  };
  categories: Array<{ id: string; name: string }>;
  profiles: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
  }>;
  stages: Array<{ id: string; name: string }>;
}

export function TemplateForm({
  mode,
  template,
  categories,
  profiles,
  stages,
}: Props) {
  const { locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: template?.name ?? "",
    description: template?.description ?? "",
    default_category_id: template?.default_category_id ?? "",
    default_phase: (template?.default_phase ?? "") as ProjectPhase | "",
    default_installation_type: template?.default_installation_type ?? "",
    default_description: template?.default_description ?? "",
    default_assigned_to: template?.default_assigned_to ?? "",
    default_stage_id: template?.default_stage_id ?? "",
    order_index: template?.order_index ?? 10,
    is_active: template?.is_active ?? true,
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await upsertTemplate({
        id: template?.id,
        name: form.name,
        description: form.description,
        default_category_id: form.default_category_id || null,
        default_phase: (form.default_phase || null) as ProjectPhase | null,
        default_installation_type: form.default_installation_type || null,
        default_description: form.default_description,
        default_assigned_to: form.default_assigned_to || null,
        default_stage_id: form.default_stage_id || null,
        order_index: form.order_index,
        is_active: form.is_active,
      });
      if (res.error) setError(res.error);
      else router.push("/admin/prosjekt-maler");
    });
  }

  function onDelete() {
    if (!template) return;
    if (
      !confirm(
        tr("adm_ptpl_delete_confirm", locale).replace("{name}", template.name),
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteTemplate({ id: template.id });
      if (res.error) setError(res.error);
      else router.push("/admin/prosjekt-maler");
    });
  }

  const installationLabel = (value: string): string => {
    switch (value) {
      case "bolig":
        return tr("adm_ptpl_install_bolig", locale);
      case "naering":
        return tr("adm_ptpl_install_naering", locale);
      case "telecom":
        return tr("adm_ptpl_install_telecom", locale);
      case "ev":
        return tr("adm_ptpl_install_ev", locale);
      default:
        return value;
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("adm_ptpl_card_info_title", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("adm_ptpl_name", locale)} required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label={tr("adm_ptpl_description", locale)}>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={tr("adm_ptpl_order", locale)}>
              <Input
                type="number"
                value={form.order_index}
                onChange={(e) =>
                  setForm({
                    ...form,
                    order_index: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </Field>
            <label className="flex items-center gap-2 self-end mb-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                className="size-4 accent-orange"
              />
              <span className="text-sm">{tr("adm_ptpl_active_label", locale)}</span>
            </label>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("adm_ptpl_prefill_title", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-xs text-text-3">
            {tr("adm_ptpl_prefill_note", locale)}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={tr("adm_ptpl_category", locale)}>
              <select
                value={form.default_category_id}
                onChange={(e) =>
                  setForm({ ...form, default_category_id: e.target.value })
                }
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("adm_ptpl_none_opt", locale)}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr("adm_ptpl_installation_type", locale)}>
              <select
                value={form.default_installation_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    default_installation_type: e.target.value,
                  })
                }
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("adm_ptpl_none_opt", locale)}</option>
                <option value="bolig">{installationLabel("bolig")}</option>
                <option value="naering">{installationLabel("naering")}</option>
                <option value="telecom">{installationLabel("telecom")}</option>
                <option value="ev">{installationLabel("ev")}</option>
              </select>
            </Field>
            <Field label={tr("adm_ptpl_phase", locale)}>
              <select
                value={form.default_phase}
                onChange={(e) =>
                  setForm({
                    ...form,
                    default_phase: e.target.value as ProjectPhase | "",
                  })
                }
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("adm_ptpl_none_opt", locale)}</option>
                {(["bidding", "production", "completed", "lost", "cancelled"] as ProjectPhase[]).map(
                  (p) => (
                    <option key={p} value={p}>
                      {PROJECT_PHASE_LABELS[p][locale]}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label={tr("adm_ptpl_stage", locale)}>
              <select
                value={form.default_stage_id}
                onChange={(e) =>
                  setForm({ ...form, default_stage_id: e.target.value })
                }
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("adm_ptpl_none_opt", locale)}</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={tr("adm_ptpl_default_owner", locale)}>
                <select
                  value={form.default_assigned_to}
                  onChange={(e) =>
                    setForm({ ...form, default_assigned_to: e.target.value })
                  }
                  className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
                >
                  <option value="">{tr("adm_ptpl_none_opt", locale)}</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <Field
            label={tr("adm_ptpl_default_description", locale)}
            hint={tr("adm_ptpl_default_description_hint", locale)}
          >
            <Textarea
              value={form.default_description}
              onChange={(e) =>
                setForm({ ...form, default_description: e.target.value })
              }
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

      <div className="flex justify-between gap-3">
        {mode === "edit" && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={pending}
            className="text-red hover:bg-red/10"
          >
            <Trash2 className="size-4" />
            {tr("adm_ptpl_delete_btn", locale)}
          </Button>
        )}
        <div className="flex gap-3 ml-auto">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            {tr("adm_ptpl_cancel", locale)}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? tr("adm_ptpl_saving", locale)
              : mode === "create"
                ? tr("adm_ptpl_create_btn", locale)
                : tr("adm_ptpl_save_btn", locale)}
          </Button>
        </div>
      </div>
    </form>
  );
}
