"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/types/database";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { createCustomer, updateCustomer } from "./actions";
import { CustomerColorPicker } from "./color-picker";
import { brregLookupByOrgNumber } from "@/app/(app)/actions/brreg";

interface Props {
  mode: "create" | "edit";
  customer?: Customer;
}

export function CustomerForm({ mode, customer }: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [brregPending, setBrregPending] = useState(false);
  const [brregMsg, setBrregMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    customer_type:
      ((customer as { customer_type?: "bedrift" | "privat" } | undefined)
        ?.customer_type ?? "bedrift") as "bedrift" | "privat",
    first_name:
      (customer as { first_name?: string | null } | undefined)?.first_name ?? "",
    last_name:
      (customer as { last_name?: string | null } | undefined)?.last_name ?? "",
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

  async function lookupBrreg() {
    setBrregMsg(null);
    const cleaned = form.org_number.replace(/\s+/g, "");
    if (!/^\d{9}$/.test(cleaned)) {
      setBrregMsg(tr("brreg_invalid_format", locale));
      return;
    }
    setBrregPending(true);
    try {
      const res = await brregLookupByOrgNumber(cleaned);
      if (res.error || !res.result) {
        setBrregMsg(res.error ?? tr("brreg_not_found", locale));
        return;
      }
      const r = res.result;
      setForm((f) => ({
        ...f,
        name: f.name || r.name,
        org_number: r.org_number,
        address: f.address || (r.address ?? ""),
        postal_code: f.postal_code || (r.postal_code ?? ""),
        city: f.city || (r.city ?? ""),
      }));
      setBrregMsg(
        r.inactive_reason
          ? tr("brreg_found_inactive", locale).replace("{r}", r.inactive_reason)
          : tr("brreg_found", locale).replace("{n}", r.name),
      );
    } finally {
      setBrregPending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Avled navn for privatkunder så vi alltid har name fylt.
    const submitForm = { ...form };
    if (submitForm.customer_type === "privat") {
      const derived = [submitForm.first_name?.trim(), submitForm.last_name?.trim()]
        .filter(Boolean)
        .join(" ");
      if (!submitForm.name.trim() && derived) {
        submitForm.name = derived;
      }
      submitForm.org_number = "";
    } else {
      submitForm.first_name = "";
      submitForm.last_name = "";
    }
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createCustomer(submitForm)
          : await updateCustomer({ id: customer!.id, ...submitForm });
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
          <Field label={tr("cust_field_type", locale)}>
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => update("customer_type", "bedrift")}
                className={`px-3 py-1.5 text-sm ${
                  form.customer_type === "bedrift"
                    ? "bg-orange text-bg"
                    : "bg-card text-text-2 hover:bg-card-hover"
                }`}
              >
                {tr("cust_type_business", locale)}
              </button>
              <button
                type="button"
                onClick={() => update("customer_type", "privat")}
                className={`px-3 py-1.5 text-sm border-l border-border ${
                  form.customer_type === "privat"
                    ? "bg-orange text-bg"
                    : "bg-card text-text-2 hover:bg-card-hover"
                }`}
              >
                {tr("cust_type_private", locale)}
              </button>
            </div>
          </Field>
          {form.customer_type === "privat" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={tr("cust_field_first_name", locale)} required>
                <Input
                  value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                  required
                />
              </Field>
              <Field label={tr("cust_field_last_name", locale)} required>
                <Input
                  value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                  required
                />
              </Field>
            </div>
          ) : (
            <Field label={tr("cust_field_company_name", locale)} required>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </Field>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.customer_type === "bedrift" && (
            <Field label={tr("cust_field_org_number", locale)}>
              <div className="flex gap-2">
                <Input
                  value={form.org_number}
                  onChange={(e) => update("org_number", e.target.value)}
                  placeholder="9 siffer"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={lookupBrreg}
                  disabled={brregPending || !form.org_number.trim()}
                  title={tr("brreg_lookup_title", locale)}
                >
                  <Search className="size-4" />
                  {brregPending ? tr("brreg_searching", locale) : tr("brreg_lookup", locale)}
                </Button>
              </div>
              {brregMsg && (
                <p className="text-xs text-text-3 mt-1">{brregMsg}</p>
              )}
            </Field>
            )}
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
