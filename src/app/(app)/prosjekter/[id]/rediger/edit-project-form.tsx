"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type {
  Project,
  InstallationType,
  ProjectPhase,
  CategoryFieldSchema,
} from "@/lib/types/database";
import { INSTALLATION_TYPE_LABELS, PROJECT_PHASE_LABELS } from "@/lib/types/database";
import { CategoryFieldsRenderer } from "@/components/app/category-fields-renderer";
import { updateProject } from "./actions";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface Option {
  id: string;
  name: string;
}
interface CustomerOption extends Option {
  org_number: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
}
interface SiteOption extends Option {
  customer_id: string | null;
}
interface StageOption extends Option {
  order_index: number;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  field_schema: CategoryFieldSchema;
}

interface Props {
  project: Project;
  customers: CustomerOption[];
  sites: SiteOption[];
  stages: StageOption[];
  categories: CategoryOption[];
}

export function EditProjectForm({
  project,
  customers,
  sites,
  stages,
  categories,
}: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: project.title,
    description: project.description ?? "",
    installation_type: (project.installation_type ?? "bolig") as InstallationType,
    phase: (project.phase ?? "production") as ProjectPhase,
    category_id: project.category_id ?? "",
    customer_id: project.customer_id ?? "",
    site_id: project.site_id ?? "",
    stage_id: project.stage_id ?? "",
    scheduled_start_date: project.scheduled_start_date ?? "",
    scheduled_end_date: project.scheduled_end_date ?? "",
    customer_name: project.customer_name ?? "",
    customer_org_number: project.customer_org_number ?? "",
    customer_contact: project.customer_contact ?? "",
    customer_email: project.customer_email ?? "",
    customer_phone: project.customer_phone ?? "",
    customer_address: project.customer_address ?? "",
    customer_postal_code: project.customer_postal_code ?? "",
    customer_city: project.customer_city ?? "",
    site_company: project.site_company ?? "",
    site_address: project.site_address ?? "",
    site_house_number: project.site_house_number ?? "",
    site_house_letter: project.site_house_letter ?? "",
    site_postal_code: project.site_postal_code ?? "",
    site_city: project.site_city ?? "",
    site_ssb_number: project.site_ssb_number ?? "",
  });

  // Filtrer sites etter valgt kunde
  const filteredSites = useMemo(() => {
    if (!form.customer_id) return sites;
    return sites.filter(
      (s) => s.customer_id === form.customer_id || !s.customer_id,
    );
  }, [sites, form.customer_id]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Importer kundedata til de fritekst-baserte customer_*-feltene fra en
  // eksisterende kunde i registeret. Tomme felter på kunden overskriver
  // ikke felter som allerede er fylt ut, slik at brukeren kan kombinere.
  function importFromCustomer(customerId: string) {
    const c = customers.find((x) => x.id === customerId);
    if (!c) return;
    setForm((f) => ({
      ...f,
      customer_id: c.id,
      customer_name: c.name ?? f.customer_name,
      customer_org_number: c.org_number ?? f.customer_org_number,
      customer_contact: c.contact_person ?? f.customer_contact,
      customer_email: c.email ?? f.customer_email,
      customer_phone: c.phone ?? f.customer_phone,
      customer_address: c.address ?? f.customer_address,
      customer_postal_code: c.postal_code ?? f.customer_postal_code,
      customer_city: c.city ?? f.customer_city,
    }));
  }

  // Category-data — JSON-object med verdier per kategori-felt
  const [categoryData, setCategoryData] = useState<Record<string, unknown>>(
    (project.category_data as Record<string, unknown>) ?? {},
  );

  const selectedCategory = categories.find((c) => c.id === form.category_id);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateProject({
        id: project.id,
        ...form,
        category_data: categoryData,
      });
      if (res.error) setError(res.error);
      else router.push(`/prosjekter/${project.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("proj_edit_section_info", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("proj_new_title_label", locale)} required>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={tr("proj_new_installation_type", locale)}
              hint={tr("proj_edit_installation_hint", locale)}
            >
              <select
                value={form.installation_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    installation_type: e.target.value as InstallationType,
                  }))
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
            <Field label={tr("proj_edit_phase", locale)} hint={tr("proj_edit_phase_hint", locale)}>
              <select
                value={form.phase}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    phase: e.target.value as ProjectPhase,
                  }))
                }
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                {(["bidding", "production", "completed", "lost", "cancelled"] as ProjectPhase[]).map(
                  (p) => (
                    <option key={p} value={p}>
                      {PROJECT_PHASE_LABELS[p][locale]}
                    </option>
                  ),
                )}
              </select>
            </Field>
          </div>
          <Field
            label={tr("proj_edit_category", locale)}
            hint={tr("proj_edit_category_hint", locale)}
          >
            <select
              value={form.category_id}
              onChange={(e) => update("category_id", e.target.value)}
              className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            >
              <option value="">{tr("proj_edit_no_category", locale)}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("proj_new_description", locale)}>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
            />
          </Field>
        </CardBody>
      </Card>

      {selectedCategory && selectedCategory.field_schema.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {tr("proj_edit_fields_for", locale).replace("{name}", selectedCategory.name)}
            </CardTitle>
          </CardHeader>
          <CardBody>
            <CategoryFieldsRenderer
              schema={selectedCategory.field_schema}
              values={categoryData}
              onChange={setCategoryData}
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{tr("proj_edit_section_customer_site", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={tr("proj_new_existing_customer", locale)}>
              <select
                value={form.customer_id}
                onChange={(e) => update("customer_id", e.target.value)}
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("proj_edit_none_or_freetext", locale)}</option>
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
                onChange={(e) => update("site_id", e.target.value)}
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
            <Field label={tr("proj_new_stage", locale)} hint={tr("proj_edit_stage_hint", locale)}>
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
            <Field label={tr("proj_edit_planned_start", locale)} hint={tr("proj_edit_shown_in_calendar", locale)}>
              <Input
                type="date"
                value={form.scheduled_start_date}
                onChange={(e) =>
                  update("scheduled_start_date", e.target.value)
                }
              />
            </Field>
            <Field label={tr("proj_edit_planned_end", locale)} hint={tr("proj_edit_shown_in_calendar", locale)}>
              <Input
                type="date"
                value={form.scheduled_end_date}
                onChange={(e) =>
                  update("scheduled_end_date", e.target.value)
                }
              />
            </Field>
          </div>
          <p className="text-xs text-text-3">
            {tr("proj_edit_customer_site_help_prefix", locale)}{" "}
            <Link href="/kunder/ny" className="text-orange hover:underline">
              {tr("proj_edit_create_new", locale)}
            </Link>
            .
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>
              {tr("proj_edit_section_client_freetext", locale)}
            </CardTitle>
            {customers.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-3">Importer fra kunde:</label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) importFromCustomer(e.target.value);
                    e.target.value = "";
                  }}
                  className="h-8 rounded-md px-2 text-xs bg-card border border-border focus:border-orange focus:outline-none"
                >
                  <option value="">— Velg eksisterende kunde —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
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
            <Field label={tr("proj_edit_field_address", locale)}>
              <Input
                value={form.customer_address}
                onChange={(e) => update("customer_address", e.target.value)}
              />
            </Field>
            <Field label={tr("proj_edit_field_org_number", locale)}>
              <Input
                value={form.customer_org_number}
                onChange={(e) => update("customer_org_number", e.target.value)}
              />
            </Field>
            <Field label={tr("proj_new_field_postal", locale)}>
              <Input
                value={form.customer_postal_code}
                onChange={(e) => update("customer_postal_code", e.target.value)}
              />
            </Field>
            <Field label={tr("proj_new_field_city", locale)}>
              <Input
                value={form.customer_city}
                onChange={(e) => update("customer_city", e.target.value)}
              />
            </Field>
            <Field label={tr("proj_new_field_phone", locale)}>
              <Input
                type="tel"
                value={form.customer_phone}
                onChange={(e) => update("customer_phone", e.target.value)}
              />
            </Field>
            <Field label={tr("proj_new_field_email", locale)}>
              <Input
                type="email"
                value={form.customer_email}
                onChange={(e) => update("customer_email", e.target.value)}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("proj_edit_section_site_freetext", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("proj_edit_field_site_company", locale)}>
            <Input
              value={form.site_company}
              onChange={(e) => update("site_company", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <Field label={tr("proj_edit_field_address", locale)}>
                <Input
                  value={form.site_address}
                  onChange={(e) => update("site_address", e.target.value)}
                />
              </Field>
            </div>
            <Field label={tr("proj_edit_field_house_number", locale)}>
              <Input
                value={form.site_house_number}
                onChange={(e) => update("site_house_number", e.target.value)}
              />
            </Field>
            <Field label={tr("proj_edit_field_house_letter", locale)}>
              <Input
                value={form.site_house_letter}
                onChange={(e) => update("site_house_letter", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label={tr("proj_new_field_postal", locale)}>
              <Input
                value={form.site_postal_code}
                onChange={(e) => update("site_postal_code", e.target.value)}
              />
            </Field>
            <Field label={tr("proj_new_field_city", locale)}>
              <Input
                value={form.site_city}
                onChange={(e) => update("site_city", e.target.value)}
              />
            </Field>
            <Field label={tr("proj_edit_field_ssb_number", locale)}>
              <Input
                value={form.site_ssb_number}
                onChange={(e) => update("site_ssb_number", e.target.value)}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      {error && (
        <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {tr("proj_edit_cancel", locale)}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? tr("proj_edit_saving", locale) : tr("proj_edit_save", locale)}
        </Button>
      </div>
    </form>
  );
}
