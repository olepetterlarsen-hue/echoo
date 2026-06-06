"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Site } from "@/lib/types/database";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { createSite, updateSite } from "./actions";

interface CustomerOption {
  id: string;
  name: string;
}

interface Props {
  mode: "create" | "edit";
  site?: Site;
  customers: CustomerOption[];
  defaultCustomerId?: string;
}

// Stored value is Norwegian (DB value); display value can be localized.
const SITE_TYPE_KEYS = [
  { value: "Bolig", key: "site_type_residential" },
  { value: "Næringsbygg", key: "site_type_commercial" },
  { value: "Mast / Tårn", key: "site_type_mast" },
  { value: "Basestasjon innendørs", key: "site_type_base_indoor" },
  { value: "Basestasjon utendørs", key: "site_type_base_outdoor" },
  { value: "Datasenter / hytte", key: "site_type_data_center" },
  { value: "Kabelfremføring", key: "site_type_cable" },
  { value: "Ladestasjon", key: "site_type_charger" },
  { value: "Annet", key: "site_type_other" },
] as const;

export function SiteForm({ mode, site, customers, defaultCustomerId }: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    customer_id: site?.customer_id ?? defaultCustomerId ?? "",
    external_site_id: site?.external_site_id ?? "",
    name: site?.name ?? "",
    address: site?.address ?? "",
    postal_code: site?.postal_code ?? "",
    city: site?.city ?? "",
    province: site?.province ?? "",
    ssb_number: site?.ssb_number ?? "",
    latitude: site?.latitude?.toString() ?? "",
    longitude: site?.longitude?.toString() ?? "",
    site_type: site?.site_type ?? "",
    notes: site?.notes ?? "",
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
    const lat = form.latitude
      ? parseFloat(form.latitude.replace(",", "."))
      : null;
    const lon = form.longitude
      ? parseFloat(form.longitude.replace(",", "."))
      : null;
    if ((form.latitude && isNaN(lat!)) || (form.longitude && isNaN(lon!))) {
      setError(tr("site_err_coords_numeric", locale));
      return;
    }
    const payload = {
      ...form,
      latitude: lat,
      longitude: lon,
      customer_id: form.customer_id || null,
    };
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createSite(payload)
          : await updateSite({ id: site!.id, ...payload });
      if (res.error) setError(res.error);
      else if (res.id) router.push(`/sites/${res.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("site_card_basic", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("site_field_name", locale)} required>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={tr("site_field_customer", locale)}>
              <select
                value={form.customer_id}
                onChange={(e) => update("customer_id", e.target.value)}
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("site_opt_none", locale)}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr("site_field_type", locale)}>
              <select
                value={form.site_type}
                onChange={(e) => update("site_type", e.target.value)}
                className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
              >
                <option value="">{tr("site_opt_select", locale)}</option>
                {SITE_TYPE_KEYS.map((typeOpt) => (
                  <option key={typeOpt.value} value={typeOpt.value}>
                    {tr(typeOpt.key, locale)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={tr("site_field_external_id", locale)}
              hint={tr("site_field_external_id_hint", locale)}
            >
              <Input
                value={form.external_site_id}
                onChange={(e) => update("external_site_id", e.target.value)}
              />
            </Field>
            <Field label={tr("site_field_ssb", locale)}>
              <Input
                value={form.ssb_number}
                onChange={(e) => update("ssb_number", e.target.value)}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("site_card_address", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("site_field_street", locale)}>
            <Input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label={tr("site_field_postal_code", locale)}>
              <Input
                value={form.postal_code}
                onChange={(e) => update("postal_code", e.target.value)}
              />
            </Field>
            <Field label={tr("site_field_city", locale)}>
              <Input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              />
            </Field>
            <Field label={tr("site_field_province", locale)}>
              <Input
                value={form.province}
                onChange={(e) => update("province", e.target.value)}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("site_card_coords", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={tr("site_field_latitude", locale)}
              hint={tr("site_lat_hint", locale)}
            >
              <Input
                value={form.latitude}
                onChange={(e) => update("latitude", e.target.value)}
                placeholder="59.9139"
              />
            </Field>
            <Field
              label={tr("site_field_longitude", locale)}
              hint={tr("site_lon_hint", locale)}
            >
              <Input
                value={form.longitude}
                onChange={(e) => update("longitude", e.target.value)}
                placeholder="10.7522"
              />
            </Field>
          </div>
          <p className="text-xs text-text-3">{tr("site_coords_tip", locale)}</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("site_card_notes", locale)}</CardTitle>
        </CardHeader>
        <CardBody>
          <Field label={tr("site_field_internal_notes", locale)}>
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
            : mode === "create"
              ? tr("site_create_btn", locale)
              : tr("task_save_changes", locale)}
        </Button>
      </div>
    </form>
  );
}
