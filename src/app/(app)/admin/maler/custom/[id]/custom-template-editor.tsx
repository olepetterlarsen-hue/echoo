"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import type { CustomTemplate } from "@/lib/types/database";
import type { SectionDef } from "@/lib/document-templates/types";
import { updateCustomTemplate, deleteCustomTemplate } from "../actions";

interface Props {
  template: CustomTemplate;
}

export function CustomTemplateEditor({ template }: Props) {
  const { locale } = useLocale();
  const router = useRouter();
  const def = (template.definition as { sections?: SectionDef[] }) ?? {};
  const [name, setName] = useState(template.name);
  const [subtitle, setSubtitle] = useState(template.subtitle ?? "");
  const [description, setDescription] = useState(template.description ?? "");
  const [sections] = useState<SectionDef[]>(def.sections ?? []);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateCustomTemplate({
        id: template.id,
        name,
        subtitle,
        description,
      });
      if (res.error) setError(res.error);
      else setStatus("saved");
    });
  }

  function onToggleHidden() {
    startTransition(async () => {
      await updateCustomTemplate({
        id: template.id,
        is_hidden: !template.is_hidden,
      });
      router.refresh();
    });
  }

  function onDelete() {
    if (
      !confirm(
        tr("adm_tpl_cust_delete_confirm", locale).replace(
          "{name}",
          template.name,
        ),
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteCustomTemplate({ id: template.id });
      if (res.error) setError(res.error);
      else router.push("/admin/maler");
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>{tr("adm_tpl_cust_basic_info", locale)}</CardTitle>
            <div className="flex gap-1">
              {template.is_hidden && (
                <Badge tone="red">{tr("adm_tpl_cust_hidden_badge", locale)}</Badge>
              )}
              {template.ai_generated && (
                <Badge tone="blue">{tr("adm_tpl_cust_ai_badge", locale)}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("adm_tpl_cust_name", locale)} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={tr("adm_tpl_cust_subtitle_label", locale)}>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </Field>
          <Field label={tr("adm_tpl_cust_description", locale)}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {tr("adm_tpl_cust_sections_title", locale)}{" "}
            <span className="text-text-3 text-sm font-normal">
              {tr("adm_tpl_cust_sections_summary", locale)
                .replace("{sections}", String(sections.length))
                .replace(
                  "{fields}",
                  String(sections.reduce((n, s) => n + s.fields.length, 0)),
                )}
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-text-3">
            {tr("adm_tpl_cust_intro", locale)}
          </p>
          <ul className="list-disc list-inside text-sm text-text-2 mt-2 space-y-1">
            <li>{tr("adm_tpl_cust_li_1", locale)}</li>
            <li>{tr("adm_tpl_cust_li_2", locale)}</li>
            <li>{tr("adm_tpl_cust_li_3", locale)}</li>
          </ul>
          <p className="text-xs text-text-3 mt-3">
            {tr("adm_tpl_cust_outro", locale)}
          </p>
        </CardBody>
      </Card>

      {error && (
        <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
          {error}
        </p>
      )}
      {status === "saved" && (
        <p className="text-sm text-green bg-green/10 border border-green/30 rounded px-3 py-2">
          {tr("adm_tpl_cust_saved", locale)}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 sticky bottom-4 bg-bg/90 backdrop-blur p-3 rounded-lg border border-border">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onToggleHidden} disabled={pending}>
            {template.is_hidden ? (
              <>
                <Eye className="size-4" />{" "}
                {tr("adm_tpl_cust_show_again", locale)}
              </>
            ) : (
              <>
                <EyeOff className="size-4" />{" "}
                {tr("adm_tpl_cust_hide", locale)}
              </>
            )}
          </Button>
          <Button variant="danger" onClick={onDelete} disabled={pending}>
            <Trash2 className="size-4" /> {tr("adm_tpl_cust_delete", locale)}
          </Button>
        </div>
        <Button onClick={onSave} disabled={pending}>
          {pending
            ? tr("adm_tpl_cust_saving", locale)
            : tr("adm_tpl_cust_save", locale)}
        </Button>
      </div>
    </div>
  );
}
