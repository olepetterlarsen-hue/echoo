"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Plus as PlusIcon,
  Trash2,
  ChevronUp,
  ChevronDown,
  Wand2,
} from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import type {
  SectionDef,
  FieldDef,
  FieldKind,
  YnaItem,
} from "@/lib/document-templates/types";
import {
  createCustomTemplate,
  generateTemplateWithAi,
} from "../custom/actions";

interface Props {
  startInAiMode: boolean;
  hasAiKey: boolean;
}

export function NewTemplateBuilder({ startInAiMode, hasAiKey }: Props) {
  const { locale } = useLocale();
  const router = useRouter();
  const [aiOpen, setAiOpen] = useState(startInAiMode);
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [aiGenerated, setAiGenerated] = useState(false);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const FIELD_KIND_OPTIONS: { value: FieldKind; label: string }[] = [
    { value: "text", label: tr("adm_tpl_ny_field_text", locale) },
    { value: "textarea", label: tr("adm_tpl_ny_field_textarea", locale) },
    { value: "number", label: tr("adm_tpl_ny_field_number", locale) },
    { value: "date", label: tr("adm_tpl_ny_field_date", locale) },
    { value: "yes_no", label: tr("adm_tpl_ny_field_yes_no", locale) },
    { value: "checkbox", label: tr("adm_tpl_ny_field_checkbox", locale) },
    { value: "radio", label: tr("adm_tpl_ny_field_radio", locale) },
    { value: "select", label: tr("adm_tpl_ny_field_select", locale) },
    {
      value: "checkmark_group",
      label: tr("adm_tpl_ny_field_checkmark_group", locale),
    },
    { value: "yna_group", label: tr("adm_tpl_ny_field_yna_group", locale) },
  ];

  async function onGenerateWithAi() {
    if (!aiDescription.trim()) {
      setAiError(tr("adm_tpl_ny_describe_required", locale));
      return;
    }
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await generateTemplateWithAi({
        description: aiDescription,
        preferLanguage: locale,
      });
      if (res.error) {
        setAiError(res.error);
      } else if (res.template) {
        setName(res.template.title ?? "");
        setSubtitle(res.template.subtitle ?? "");
        setDescription(res.template.description ?? "");
        setSections(res.template.sections ?? []);
        setAiGenerated(true);
        setAiOpen(false);
      } else {
        setAiError(tr("adm_tpl_ny_ai_no_response", locale));
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : tr("adm_tpl_ny_unknown_error", locale);
      setAiError(tr("adm_tpl_ny_unexpected", locale).replace("{msg}", msg));
    } finally {
      setAiLoading(false);
    }
  }

  function addSection() {
    setSections((s) => [
      ...s,
      { title: tr("adm_tpl_ny_new_section", locale), fields: [] },
    ]);
  }
  function removeSection(idx: number) {
    setSections((s) => s.filter((_, i) => i !== idx));
  }
  function updateSection(idx: number, patch: Partial<SectionDef>) {
    setSections((s) =>
      s.map((sec, i) => (i === idx ? { ...sec, ...patch } : sec)),
    );
  }
  function moveSection(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= sections.length) return;
    const copy = [...sections];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    setSections(copy);
  }
  function addField(sIdx: number) {
    setSections((s) =>
      s.map((sec, i) =>
        i !== sIdx
          ? sec
          : {
              ...sec,
              fields: [
                ...sec.fields,
                {
                  key: `felt_${Math.random().toString(36).slice(2, 7)}`,
                  label: tr("adm_tpl_ny_new_field", locale),
                  kind: "text",
                },
              ],
            },
      ),
    );
  }
  function updateField(sIdx: number, fIdx: number, patch: Partial<FieldDef>) {
    setSections((s) =>
      s.map((sec, i) =>
        i !== sIdx
          ? sec
          : {
              ...sec,
              fields: sec.fields.map((f, j) =>
                j !== fIdx ? f : { ...f, ...patch },
              ),
            },
      ),
    );
  }
  function removeField(sIdx: number, fIdx: number) {
    setSections((s) =>
      s.map((sec, i) =>
        i !== sIdx
          ? sec
          : { ...sec, fields: sec.fields.filter((_, j) => j !== fIdx) },
      ),
    );
  }

  function onSave() {
    setError(null);
    if (!name.trim()) {
      setError(tr("adm_tpl_ny_name_required", locale));
      return;
    }
    startTransition(async () => {
      const res = await createCustomTemplate({
        name,
        subtitle,
        description,
        sections,
        aiGenerated,
      });
      if (res.error) setError(res.error);
      else if (res.template) {
        router.push(`/admin/maler/custom/${res.template.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* AI-panel */}
      <Card className="border-blue/30 bg-blue/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-blue" />
            {tr("adm_tpl_ny_ai_card_title", locale)}
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {!hasAiKey ? (
            <div className="text-sm text-text-2 space-y-1">
              <p>
                {tr("adm_tpl_ny_ai_missing_key_p1", locale)
                  .split("ANTHROPIC_API_KEY")
                  .map((part, i, arr) =>
                    i < arr.length - 1 ? (
                      <span key={i}>
                        {part}
                        <code className="text-orange">ANTHROPIC_API_KEY</code>
                      </span>
                    ) : (
                      <span key={i}>{part}</span>
                    ),
                  )}
              </p>
              <p className="text-xs text-text-3">
                {tr("adm_tpl_ny_ai_missing_key_p2_pre", locale)}{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  className="text-orange hover:underline"
                  rel="noreferrer"
                >
                  console.anthropic.com
                </a>
                .
              </p>
            </div>
          ) : aiOpen ? (
            <>
              <Field
                label={tr("adm_tpl_ny_ai_describe_label", locale)}
                hint={tr("adm_tpl_ny_ai_describe_hint", locale)}
              >
                <Textarea
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  rows={3}
                  placeholder={tr("adm_tpl_ny_ai_describe_ph", locale)}
                />
              </Field>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAiOpen(false)}
                  disabled={aiLoading}
                >
                  {tr("adm_tpl_ny_ai_cancel", locale)}
                </Button>
                <Button
                  size="sm"
                  onClick={onGenerateWithAi}
                  disabled={aiLoading}
                >
                  <Wand2 className="size-4" />
                  {aiLoading
                    ? tr("adm_tpl_ny_ai_generating", locale)
                    : tr("adm_tpl_ny_ai_generate", locale)}
                </Button>
              </div>
              {aiError && (
                <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
                  {aiError}
                </p>
              )}
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAiOpen(true)}
            >
              <Sparkles className="size-4" />
              {sections.length > 0
                ? tr("adm_tpl_ny_ai_regen", locale)
                : tr("adm_tpl_ny_ai_describe_btn", locale)}
            </Button>
          )}
        </CardBody>
      </Card>

      {/* Grunnleggende info */}
      <Card>
        <CardHeader>
          <CardTitle>{tr("adm_tpl_ny_basic_info", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("adm_tpl_ny_name_label", locale)} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={tr("adm_tpl_ny_subtitle_label", locale)}>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </Field>
          <Field
            label={tr("adm_tpl_ny_desc_label", locale)}
            hint={tr("adm_tpl_ny_desc_hint", locale)}
          >
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </Field>
          {aiGenerated && (
            <Badge tone="blue">{tr("adm_tpl_ny_ai_draft_badge", locale)}</Badge>
          )}
        </CardBody>
      </Card>

      {/* Seksjoner og felt */}
      {sections.map((section, sIdx) => (
        <Card key={sIdx}>
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  value={section.title}
                  onChange={(e) =>
                    updateSection(sIdx, { title: e.target.value })
                  }
                  className="w-full text-base font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-orange focus:outline-none py-1"
                  placeholder={tr("adm_tpl_ny_section_title_ph", locale)}
                />
                <input
                  value={section.description ?? ""}
                  onChange={(e) =>
                    updateSection(sIdx, { description: e.target.value })
                  }
                  placeholder={tr("adm_tpl_ny_section_desc_ph", locale)}
                  className="w-full text-xs text-text-3 bg-transparent border-b border-transparent hover:border-border focus:border-orange focus:outline-none py-1"
                />
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveSection(sIdx, -1)}
                  disabled={sIdx === 0}
                  className="text-text-3 hover:text-text-1 disabled:opacity-30 p-1"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(sIdx, 1)}
                  disabled={sIdx === sections.length - 1}
                  className="text-text-3 hover:text-text-1 disabled:opacity-30 p-1"
                >
                  <ChevronDown className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(sIdx)}
                  className="text-text-3 hover:text-red p-1"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {section.fields.map((field, fIdx) => (
              <FieldEditor
                key={fIdx}
                field={field}
                onChange={(patch) => updateField(sIdx, fIdx, patch)}
                onRemove={() => removeField(sIdx, fIdx)}
                fieldKindOptions={FIELD_KIND_OPTIONS}
              />
            ))}
            <button
              type="button"
              onClick={() => addField(sIdx)}
              className="text-sm text-orange hover:underline inline-flex items-center gap-1"
            >
              <PlusIcon className="size-4" />{" "}
              {tr("adm_tpl_ny_add_field", locale)}
            </button>
          </CardBody>
        </Card>
      ))}

      <Button variant="secondary" onClick={addSection}>
        <PlusIcon className="size-4" />
        {tr("adm_tpl_ny_add_section", locale)}
      </Button>

      {error && (
        <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 sticky bottom-4 bg-bg/90 backdrop-blur p-3 rounded-lg border border-border">
        <Button onClick={onSave} disabled={pending}>
          {pending
            ? tr("adm_tpl_ny_saving", locale)
            : tr("adm_tpl_ny_save_template", locale)}
        </Button>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  onChange,
  onRemove,
  fieldKindOptions,
}: {
  field: FieldDef;
  onChange: (patch: Partial<FieldDef>) => void;
  onRemove: () => void;
  fieldKindOptions: { value: FieldKind; label: string }[];
}) {
  const { locale } = useLocale();
  return (
    <div className="border border-border rounded-md p-3 space-y-2">
      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-text-3 block mb-1">
            {tr("adm_tpl_ny_question_label", locale)}
          </label>
          <Input
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </div>
        <div className="w-44">
          <label className="text-xs text-text-3 block mb-1">
            {tr("adm_tpl_ny_field_type", locale)}
          </label>
          <select
            value={field.kind}
            onChange={(e) => onChange({ kind: e.target.value as FieldKind })}
            className="w-full h-10 rounded px-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
          >
            {fieldKindOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-text-3 hover:text-red p-2 mt-6"
          aria-label={tr("adm_tpl_ny_remove_field", locale)}
          title={tr("adm_tpl_ny_remove_field", locale)}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div>
        <label className="text-xs text-text-3 block mb-1">
          {tr("adm_tpl_ny_help_text", locale)}
        </label>
        <Input
          value={field.hint ?? ""}
          onChange={(e) =>
            onChange({ hint: e.target.value.trim() || undefined })
          }
        />
      </div>

      {(field.kind === "select" ||
        field.kind === "radio" ||
        field.kind === "checkmark_group") && (
        <OptionsEditor
          options={field.options ?? []}
          onChange={(options) => onChange({ options })}
        />
      )}

      {field.kind === "yna_group" && (
        <YnaItemsEditor
          items={field.items ?? []}
          onChange={(items) => onChange({ items })}
        />
      )}

      <label className="inline-flex items-center gap-2 text-xs text-text-2">
        <input
          type="checkbox"
          checked={field.required ?? false}
          onChange={(e) => onChange({ required: e.target.checked })}
          className="size-3 accent-orange"
        />
        {tr("adm_tpl_ny_required", locale)}
      </label>
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
  return (
    <div>
      <label className="text-xs text-text-3 block mb-1">
        {tr("adm_tpl_ny_options", locale)} ({options.length})
      </label>
      <div className="space-y-1">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={opt}
              onChange={(e) =>
                onChange(options.map((o, idx) => (idx === i ? e.target.value : o)))
              }
              className="flex-1 h-8 rounded px-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onChange(options.filter((_, idx) => idx !== i))}
              className="text-text-3 hover:text-red"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...options, ""])}
        className="text-sm text-orange hover:underline mt-1"
      >
        {tr("adm_tpl_ny_option_add", locale)}
      </button>
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
  return (
    <div>
      <label className="text-xs text-text-3 block mb-1">
        {tr("adm_tpl_ny_checkpoints", locale)} ({items.length})
      </label>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={item.key} className="flex gap-2">
            <input
              value={item.label}
              onChange={(e) =>
                onChange(
                  items.map((it, idx) =>
                    idx === i ? { ...it, label: e.target.value } : it,
                  ),
                )
              }
              className="flex-1 h-8 rounded px-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-text-3 hover:text-red"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          onChange([
            ...items,
            {
              key: `item_${Math.random().toString(36).slice(2, 7)}`,
              label: "",
            },
          ])
        }
        className="text-sm text-orange hover:underline mt-1"
      >
        {tr("adm_tpl_ny_checkpoint_add", locale)}
      </button>
    </div>
  );
}
