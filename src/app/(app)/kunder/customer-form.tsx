"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/types/database";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { createCustomer, updateCustomer } from "./actions";
import { CustomerColorPicker } from "./color-picker";

interface Props {
  mode: "create" | "edit";
  customer?: Customer;
}

export function CustomerForm({ mode, customer }: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: customer?.name ?? "",
    org_number: customer?.org_number ?? "",
    contact_person: customer?.contact_person ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    postal_code: customer?.postal_code ?? "",
    city: customer?.city ?? "",
    notes: customer?.notes ?? "",
    map_color: customer?.map_color ?? null as string | null,
    active: customer?.active ?? true,
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
      const res =
        mode === "create"
          ? await createCustomer(form)
          : await updateCustomer({ id: customer!.id, ...form });
      if (res.error) setError(res.error);
      else if (res.id) router.push(`/kunder/${res.id}`);
      else router.push("/kunder");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("cust_card_basic", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("cust_field_company_name", locale)} required>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={tr("cust_field_org_number", locale)}>
              <Input
                value={form.org_number}
                onChange={(e) => update("org_number", e.target.value)}
              />
            </Field>
            <Field label={tr("cust_field_contact_person", locale)}>
              <Input
                value={form.contact_person}
                onChange={(e) => update("contact_person", e.target.value)}
              />
            </Field>
            <Field label={tr("cust_field_email", locale)}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </Field>
            <Field label={tr("cust_field_phone", locale)}>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("cust_card_address", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("cust_field_street", locale)}>
            <Input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label={tr("cust_field_postal_code", locale)}>
              <Input
                value={form.postal_code}
                onChange={(e) => update("postal_code", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label={tr("cust_field_city", locale)}>
                <Input
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("cust_card_map_color", locale)}</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-xs text-text-3 mb-3">
            {tr("cust_map_color_hint", locale)}
          </p>
          <CustomerColorPicker
            value={form.map_color}
            onChange={(v) => update("map_color", v)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("cust_card_notes", locale)}</CardTitle>
        </CardHeader>
        <CardBody>
          <Field
            label={tr("cust_field_internal_notes", locale)}
            hint={tr("cust_internal_notes_hint", locale)}
          >
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
            />
          </Field>
        </CardBody>
      </Card>

      {mode === "edit" && (
        <Card>
          <CardBody>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => update("active", e.target.checked)}
                className="size-4 accent-orange"
              />
              <span className="text-sm">{tr("cust_active_label", locale)}</span>
            </label>
            <p className="text-xs text-text-3 mt-1">
              {tr("cust_inactive_hint", locale)}
            </p>
          </CardBody>
        </Card>
      )}

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
              ? tr("cust_create_btn", locale)
              : tr("task_save_changes", locale)}
        </Button>
      </div>
    </form>
  );
}
