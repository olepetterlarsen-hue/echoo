"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { INSTALLATION_TYPE_LABELS, type InstallationType } from "@/lib/types/database";
import { createProject } from "./actions";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface Option {
  id: string;
  name: string;
}
interface SiteOption extends Option {
  customer_id: string | null;
}
interface StageOption extends Option {
  order_index: number;
}

interface TemplateOption {
  id: string;
  name: string;
  description: string | null;
}

interface SelectedTemplate {
  id: string;
  name: string;
  default_category_id: string | null;
  default_phase: string | null;
  default_installation_type: string | null;
  default_description: string | null;
  default_assigned_to: string | null;
  default_stage_id: string | null;
}

interface Props {
  customers: Option[];
  sites: SiteOption[];
  stages: StageOption[];
  templates?: TemplateOption[];
  selectedTemplate?: SelectedTemplate | null;
  defaultCustomerId?: string;
  defaultSiteId?: string;
}

export function NewProjectForm({
  customers,
  sites,
  stages,
  templates = [],
  selectedTemplate = null,
  defaultCustomerId,
  defaultSiteId,
}: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    project_number: "",
    title: "",
    description: selectedTemplate?.default_description ?? "",
    installation_type: ((selectedTemplate?.default_installation_type as
      | InstallationType
      | null) ?? "bolig") as InstallationType,
    customer_id: defaultCustomerId ?? "",
    site_id: defaultSiteId ?? "",
    stage_id: selectedTemplate?.default_stage_id ?? stages[0]?.id ?? "",
    customer_name: "",
    customer_org_number: "",
    customer_contact: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    customer_postal_code: "",
    customer_city: "",
    site_company: "",
    site_address: "",
    site_house_number: "",
    site_house_letter: "",
    site_postal_code: "",
    site_city: "",
    site_ssb_number: "",
  });

  // Sites filtreres etter valgt kunde
  const filteredSites = useMemo(() => {
    if (!form.customer_id) return sites;
    return sites.filter(
      (s) => s.customer_id === form.customer_id || !s.customer_id,
    );
  }, [sites, form.customer_id]);

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
      const res = await createProject({
        ...form,
        customer_id: form.customer_id || undefined,
        site_id: form.site_id || undefined,
        stage_id: form.stage_id || undefined,
      });
      if (res.error) setError(res.error);
      else if (res.id) router.push(`/prosjekter/${res.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Mal-velger (vises kun hvis maler finnes og ingen er aktiv enda) */}
      {templates.length > 0 && !selectedTemplate && (
        <Card className="border-orange/30 bg-orange/5">
          <CardBody>
            <h3 className="text-xs uppercase tracking-wider text-orange font-semibold mb-2">
              {tr("proj_new_template_heading", locale)}
            </h3>
            <p className="text-xs text-text-2 mb-3">
              {tr("proj_new_template_help", locale)}
            </p>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <Link
                  key={t.id}
                  href={`/prosjekter/ny?template=${t.id}`}
                  className="px-3 py-1.5 rounded-md text-sm bg-card border border-border hover:border-orange transition-colors"
                  title={t.description ?? ""}
                >
                  {t.name}
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
      {selectedTemplate && (
        <Card className="border-orange/30 bg-orange/5">
          <CardBody className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-text-3">{tr("proj_new_using_template", locale)}</span>{" "}
              <span className="font-medium text-orange">
                {selectedTemplate.name}
              </span>
            </div>
            <Link
              href="/prosjekter/ny"
              className="text-xs text-text-3 hover:text-text-1 underline"
            >
              {tr("proj_new_clear_template", locale)}
            </Link>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{tr("proj_new_section_info", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label={tr("proj_new_order_number", locale)} required hint={tr("proj_new_order_number_hint", locale)}>
              <Input
                value={form.project_number}
                onChange={(e) => update("project_number", e.target.value)}
                required
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label={tr("proj_new_title_label", locale)} required>
                <Input
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  required
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={tr("proj_new_installation_type", locale)}
              required
              hint={tr("proj_new_installation_type_hint", locale)}
            >
              <select
                value={form.installation_type}
                onChange={(e) =>
                  update(
                    "installation_type",
                    e.target.value as InstallationType,
                  )
                }
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                {(["bolig", "naering", "telecom", "ev"] as InstallationType[]).map(
                  (it) => (
                    <option key={it} value={it}>
                      {INSTALLATION_TYPE_LABELS[it][locale]}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label={tr("proj_new_stage", locale)} hint={tr("proj_new_stage_hint", locale)}>
              <select
                value={form.stage_id}
                onChange={(e) => update("stage_id", e.target.value)}
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("proj_new_none", locale)}</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={tr("proj_new_description", locale)}>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("proj_new_section_customer_site", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={tr("proj_new_existing_customer", locale)}>
              <select
                value={form.customer_id}
                onChange={(e) =>
                  update("customer_id", e.target.value as typeof form.customer_id)
                }
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("proj_new_none_or_create", locale)}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr("proj_new_existing_site", locale)}>
              <select
                value={form.site_id}
                onChange={(e) =>
                  update("site_id", e.target.value as typeof form.site_id)
                }
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("proj_new_none", locale)}</option>
                {filteredSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="text-xs text-text-3">
            {tr("proj_new_tip_prefix", locale)}{" "}
            <Link href="/kunder/ny" className="text-orange hover:underline">
              {tr("proj_new_link_customers", locale)}
            </Link>{" "}
            {tr("proj_new_tip_and", locale)}{" "}
            <Link href="/sites/ny" className="text-orange hover:underline">
              {tr("proj_new_link_sites", locale)}
            </Link>{" "}
            {tr("proj_new_tip_suffix", locale)}
          </p>
        </CardBody>
      </Card>

      <details>
        <summary className="text-sm text-text-3 cursor-pointer hover:text-text-1">
          {tr("proj_new_legacy_fields", locale)}
        </summary>
        <div className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{tr("proj_new_customer_freetext", locale)}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={tr("proj_new_field_company_name", locale)}>
                  <Input
                    value={form.customer_name}
                    onChange={(e) => update("customer_name", e.target.value)}
                  />
                </Field>
                <Field label={tr("proj_new_field_contact_person", locale)}>
                  <Input
                    value={form.customer_contact}
                    onChange={(e) => update("customer_contact", e.target.value)}
                  />
                </Field>
                <Field label={tr("proj_new_field_phone", locale)}>
                  <Input
                    value={form.customer_phone}
                    onChange={(e) => update("customer_phone", e.target.value)}
                  />
                </Field>
                <Field label={tr("proj_new_field_email", locale)}>
                  <Input
                    value={form.customer_email}
                    onChange={(e) => update("customer_email", e.target.value)}
                  />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tr("proj_new_site_address", locale)}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Field label={tr("proj_new_field_street", locale)}>
                <Input
                  value={form.site_address}
                  onChange={(e) => update("site_address", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label={tr("proj_new_field_postal", locale)}>
                  <Input
                    value={form.site_postal_code}
                    onChange={(e) =>
                      update("site_postal_code", e.target.value)
                    }
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label={tr("proj_new_field_city", locale)}>
                    <Input
                      value={form.site_city}
                      onChange={(e) => update("site_city", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </details>

      {error && (
        <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {tr("proj_new_cancel", locale)}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? tr("proj_new_creating", locale) : tr("proj_new_create", locale)}
        </Button>
      </div>
    </form>
  );
}
