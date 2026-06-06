"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus as PlusIcon, RotateCcw } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import type { DocumentKind } from "@/lib/types/database";
import type {
  TemplateDef,
  SectionDef,
  FieldDef,
  YnaItem,
  RiskColumn,
} from "@/lib/document-templates/types";
import { saveTemplate, restoreDefault } from "./actions";

interface Props {
  kind: DocumentKind;
  current: TemplateDef;
  defaultDef: TemplateDef;
}

export function TemplateEditor({ kind, current, defaultDef }: Props) {
  const { locale } = useLocale();
  const router = useRouter();
  const [def, setDef] = useState<TemplateDef>(current);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function updateSection(i: number, patch: Partial<SectionDef>) {
    setDef((d) => ({
      ...d,
      sections: d.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  }

  function updateField(
    sectionIdx: number,
    fieldIdx: number,
    patch: Partial<FieldDef>,
  ) {
    setDef((d) => ({
      ...d,
      sections: d.sections.map((s, sI) =>
        sI !== sectionIdx
          ? s
          : {
              ...s,
              fields: s.fields.map((f, fI) =>
                fI !== fieldIdx ? f : { ...f, ...patch },
              ),
            },
      ),
    }));
  }

  function onSave() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const res = await saveTemplate({ kind, definition: def });
      if (res?.error) {
        setStatus("error");
        setError(res.error);
      } else {
        setStatus("saved");
        router.refresh();
      }
    });
  }

  function onRestore() {
    if (!confirm(tr("adm_tpl_restore_confirm", locale))) return;
    startTransition(async () => {
      const res = await restoreDefault({ kind });
      if (!res?.error) {
        setDef(defaultDef);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Field label={tr("adm_tpl_doc_title", locale)}>
                <Input
                  value={def.title}
                  onChange={(e) => setDef({ ...def, title: e.target.value })}
                />
              </Field>
            </div>
            <Field label={tr("adm_tpl_revision", locale)}>
              <Input
                value={def.revision}
                onChange={(e) => setDef({ ...def, revision: e.target.value })}
              />
            </Field>
          </div>
          <Field label={tr("adm_tpl_subtitle_field", locale)}>
            <Input
              value={def.subtitle}
              onChange={(e) => setDef({ ...def, subtitle: e.target.value })}
            />
          </Field>
        </CardBody>
      </Card>

      {def.sections.map((section, sI) => (
        <Card key={sI}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <input
                  value={section.title}
                  onChange={(e) =>
                    updateSection(sI, { title: e.target.value })
                  }
                  className="w-full text-base font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-orange focus:outline-none py-1"
                />
                <input
                  value={section.description ?? ""}
                  placeholder={tr("adm_tpl_section_optional_desc", locale)}
                  onChange={(e) =>
                    updateSection(sI, { description: e.target.value })
                  }
                  className="w-full text-xs text-text-3 bg-transparent border-b border-transparent hover:border-border focus:border-orange focus:outline-none py-1"
                />
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {section.fields.map((field, fI) => (
              <FieldEditor
                key={field.key}
                field={field}
                onChange={(patch) => updateField(sI, fI, patch)}
              />
            ))}
          </CardBody>
        </Card>
      ))}

      {error && (
        <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
          {error}
        </p>
      )}
      {status === "saved" && (
        <p className="text-sm text-green bg-green/10 border border-green/30 rounded px-3 py-2">
          {tr("adm_tpl_saved_ok", locale)}
        </p>
      )}

      <div className="flex justify-between gap-3 sticky bottom-4 bg-bg/90 backdrop-blur p-3 rounded-lg border border-border">
        <Button variant="ghost" onClick={onRestore} disabled={pending}>
          <RotateCcw className="size-4" />
          {tr("adm_tpl_restore_btn", locale)}
        </Button>
        <Button onClick={onSave} disabled={pending}>
          {pending ? tr("adm_tpl_saving", locale) : tr("adm_tpl_save", locale)}
        </Button>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  onChange,
}: {
  field: FieldDef;
  onChange: (patch: Partial<FieldDef>) => void;
}) {
  const { locale } = useLocale();
  return (
    <div className="border border-border rounded-md p-3 space-y-3">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-text-3 block mb-1">
            {tr("adm_tpl_label", locale)}
          </label>
          <Input
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder={tr("adm_tpl_label_ph_hidden", locale)}
          />
        </div>
        <div>
          <label className="text-xs text-text-3 block mb-1">
            {tr("adm_tpl_field_type", locale)}
          </label>
          <Badge tone="neutral">{field.kind}</Badge>
        </div>
      </div>

      {(field.hint !== undefined || field.kind !== "info") && (
        <div>
          <label className="text-xs text-text-3 block mb-1">
            {tr("adm_tpl_help_text", locale)}
          </label>
          <Input
            value={field.hint ?? ""}
            onChange={(e) =>
              onChange({ hint: e.target.value.trim() || undefined })
            }
            placeholder={tr("adm_tpl_field_optional", locale)}
          />
        </div>
      )}

      {(field.kind === "yna_group" || field.kind === "yna_measurement_group") && (
        <YnaItemsEditor
          items={field.items ?? []}
          onChange={(items) => onChange({ items })}
        />
      )}

      {(field.kind === "radio" ||
        field.kind === "checkmark_group" ||
        field.kind === "select") && (
        <OptionsEditor
          options={field.options ?? []}
          onChange={(options) => onChange({ options })}
        />
      )}

      {field.kind === "risk_table" && (
        <RiskColumnsEditor
          columns={field.columns ?? []}
          onChange={(columns) => onChange({ columns })}
        />
      )}

      {field.kind === "info" && (
        <div>
          <label className="text-xs text-text-3 block mb-1">
            {tr("adm_tpl_static_text", locale)}
          </label>
          <textarea
            value={(field.defaultValue as string) ?? ""}
            onChange={(e) =>
              onChange({ defaultValue: e.target.value })
            }
            rows={4}
            className="w-full rounded-md px-3 py-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

function YnaItemsEditor({
  items,
  onChange,
}: {
  items: YnaItem[];
  onChange: (items: YnaItem[]) => void;
}) {
  const { locale } = useLocale();
  function update(i: number, patch: Partial<YnaItem>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function add() {
    const key = `item_${Math.random().toString(36).slice(2, 8)}`;
    onChange([...items, { key, label: "" }]);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  }

  return (
    <div>
      <label className="text-xs text-text-3 block mb-1">
        {tr("adm_tpl_checkpoints", locale)} ({items.length})
      </label>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={item.key} className="flex items-center gap-2">
            <span className="text-xs text-text-3 w-6 text-right">{i + 1}.</span>
            <input
              value={item.label}
              onChange={(e) => update(i, { label: e.target.value })}
              className="flex-1 h-8 rounded px-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            />
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="text-text-3 hover:text-text-1 disabled:opacity-30 text-xs px-1"
              aria-label={tr("adm_tpl_move_up", locale)}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
              className="text-text-3 hover:text-text-1 disabled:opacity-30 text-xs px-1"
              aria-label={tr("adm_tpl_move_down", locale)}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-text-3 hover:text-red"
              aria-label={tr("adm_tpl_remove", locale)}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="text-sm text-orange hover:underline inline-flex items-center gap-1 mt-2"
      >
        <PlusIcon className="size-4" /> {tr("adm_tpl_add_checkpoint", locale)}
      </button>
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const { locale } = useLocale();
  function update(i: number, v: string) {
    onChange(options.map((o, idx) => (idx === i ? v : o)));
  }
  function add() {
    onChange([...options, ""]);
  }
  function remove(i: number) {
    onChange(options.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <label className="text-xs text-text-3 block mb-1">
        {tr("adm_tpl_options", locale)} ({options.length})
      </label>
      <div className="space-y-1">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={opt}
              onChange={(e) => update(i, e.target.value)}
              className="flex-1 h-8 rounded px-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-text-3 hover:text-red"
              aria-label={tr("adm_tpl_remove", locale)}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="text-sm text-orange hover:underline inline-flex items-center gap-1 mt-2"
      >
        <PlusIcon className="size-4" /> {tr("adm_tpl_add_option", locale)}
      </button>
    </div>
  );
}

function RiskColumnsEditor({
  columns,
  onChange,
}: {
  columns: RiskColumn[];
  onChange: (columns: RiskColumn[]) => void;
}) {
  const { locale } = useLocale();
  function update(i: number, patch: Partial<RiskColumn>) {
    onChange(
      columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    );
  }
  return (
    <div>
      <label className="text-xs text-text-3 block mb-1">
        {tr("adm_tpl_columns", locale)} ({columns.length})
      </label>
      <div className="space-y-1">
        {columns.map((c, i) => (
          <div key={c.key} className="flex items-center gap-2">
            <span className="text-xs text-text-3 font-mono w-24 truncate">
              {c.key}
            </span>
            <input
              value={c.label}
              onChange={(e) => update(i, { label: e.target.value })}
              className="flex-1 h-8 rounded px-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            />
            <select
              value={c.width ?? "normal"}
              onChange={(e) =>
                update(i, {
                  width: e.target.value as RiskColumn["width"],
                })
              }
              className="h-8 rounded px-2 text-xs bg-surface border border-border"
            >
              <option value="narrow">{tr("adm_tpl_col_width_narrow", locale)}</option>
              <option value="normal">{tr("adm_tpl_col_width_normal", locale)}</option>
              <option value="wide">{tr("adm_tpl_col_width_wide", locale)}</option>
            </select>
          </div>
        ))}
      </div>
      <p className="text-xs text-text-3 mt-2">{tr("adm_tpl_col_note", locale)}</p>
    </div>
  );
}
