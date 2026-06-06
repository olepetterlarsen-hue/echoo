"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import type {
  CategoryField,
  CategoryFieldSchema,
  CategoryFieldType,
} from "@/lib/types/database";
import { upsertCategory, deleteCategory } from "./actions";

interface Props {
  mode: "create" | "edit";
  category?: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    order_index: number;
    is_active: boolean;
    field_schema: CategoryFieldSchema;
  };
}

export function CategoryForm({ mode, category }: Props) {
  const { locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const FIELD_TYPE_LABELS: Record<CategoryFieldType, string> = {
    text: tr("adm_cat_field_type_text", locale),
    number: tr("adm_cat_field_type_number", locale),
    dropdown: tr("adm_cat_field_type_dropdown", locale),
    yes_no: tr("adm_cat_field_type_yes_no", locale),
  };

  const [form, setForm] = useState({
    slug: category?.slug ?? "",
    name: category?.name ?? "",
    description: category?.description ?? "",
    order_index: category?.order_index ?? 10,
    is_active: category?.is_active ?? true,
  });
  const [fields, setFields] = useState<CategoryField[]>(
    category?.field_schema ?? [],
  );

  function addField() {
    setFields((f) => [
      ...f,
      {
        key: `felt_${f.length + 1}`,
        label: tr("adm_tpl_ny_new_field", locale),
        type: "text",
      },
    ]);
  }
  function updateField(idx: number, patch: Partial<CategoryField>) {
    setFields((f) => f.map((fld, i) => (i === idx ? { ...fld, ...patch } : fld)));
  }
  function removeField(idx: number) {
    setFields((f) => f.filter((_, i) => i !== idx));
  }
  function moveField(idx: number, dir: -1 | 1) {
    const next = [...fields];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setFields(next);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await upsertCategory({
        id: category?.id,
        slug: form.slug,
        name: form.name,
        description: form.description,
        order_index: form.order_index,
        is_active: form.is_active,
        field_schema: fields,
      });
      if (res.error) setError(res.error);
      else router.push("/admin/kategorier");
    });
  }

  function onDelete() {
    if (!category) return;
    if (
      !confirm(
        tr("adm_cat_delete_confirm", locale).replace("{name}", category.name),
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteCategory({ id: category.id });
      if (res.error) setError(res.error);
      else router.push("/admin/kategorier");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("adm_cat_basic_info", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={tr("adm_cat_name", locale)} required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field
              label={tr("adm_cat_slug", locale)}
              required
              hint={tr("adm_cat_slug_hint", locale)}
            >
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm({
                    ...form,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                  })
                }
                required
              />
            </Field>
          </div>
          <Field label={tr("adm_cat_description", locale)}>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={tr("adm_cat_order", locale)}
              hint={tr("adm_cat_order_hint", locale)}
            >
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
              <span className="text-sm">{tr("adm_cat_active_label", locale)}</span>
            </label>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>
            {tr("adm_cat_custom_fields_title", locale)} ({fields.length})
          </CardTitle>
          <Button type="button" variant="secondary" size="sm" onClick={addField}>
            <Plus className="size-4" />
            {tr("adm_cat_add_field", locale)}
          </Button>
        </CardHeader>
        <CardBody className="space-y-3">
          {fields.length === 0 ? (
            <p className="text-sm text-text-3 text-center py-4">
              {tr("adm_cat_no_fields", locale)}
            </p>
          ) : (
            fields.map((f, idx) => (
              <div
                key={idx}
                className="border border-border rounded-md p-3 bg-card space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveField(idx, -1)}
                      disabled={idx === 0}
                      className="text-text-3 hover:text-text-1 disabled:opacity-30"
                    >
                      <GripVertical className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(idx, 1)}
                      disabled={idx === fields.length - 1}
                      className="text-text-3 hover:text-text-1 disabled:opacity-30"
                    >
                      <GripVertical className="size-3 rotate-180" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                    <Input
                      placeholder={tr("adm_cat_field_key_ph", locale)}
                      value={f.key}
                      onChange={(e) =>
                        updateField(idx, {
                          key: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, ""),
                        })
                      }
                    />
                    <Input
                      placeholder={tr("adm_cat_field_label_ph", locale)}
                      value={f.label}
                      onChange={(e) =>
                        updateField(idx, { label: e.target.value })
                      }
                    />
                    <select
                      value={f.type}
                      onChange={(e) =>
                        updateField(idx, {
                          type: e.target.value as CategoryFieldType,
                        })
                      }
                      className="h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
                    >
                      {(["text", "number", "dropdown", "yes_no"] as CategoryFieldType[]).map(
                        (t) => (
                          <option key={t} value={t}>
                            {FIELD_TYPE_LABELS[t]}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="text-text-3 hover:text-red"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {f.type === "dropdown" && (
                  <Input
                    placeholder={tr("adm_cat_field_options_ph", locale)}
                    value={(f.options ?? []).join(", ")}
                    onChange={(e) =>
                      updateField(idx, {
                        options: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                )}
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={f.required ?? false}
                      onChange={(e) =>
                        updateField(idx, { required: e.target.checked })
                      }
                      className="size-3 accent-orange"
                    />
                    {tr("adm_cat_field_required", locale)}
                  </label>
                  <Input
                    placeholder={tr("adm_cat_field_hint_ph", locale)}
                    value={f.hint ?? ""}
                    onChange={(e) =>
                      updateField(idx, { hint: e.target.value })
                    }
                    className="flex-1 h-7 text-xs"
                  />
                </div>
              </div>
            ))
          )}
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
            {tr("adm_cat_delete_btn", locale)}
          </Button>
        )}
        <div className="flex gap-3 ml-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
          >
            {tr("adm_cat_cancel", locale)}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? tr("adm_cat_saving", locale)
              : mode === "create"
                ? tr("adm_cat_create_btn", locale)
                : tr("adm_cat_save_btn", locale)}
          </Button>
        </div>
      </div>
    </form>
  );
}
