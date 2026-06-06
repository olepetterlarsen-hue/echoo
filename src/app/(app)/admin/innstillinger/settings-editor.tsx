"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import type { AppSettings } from "@/lib/types/database";
import { saveSettings } from "./actions";

interface Props {
  settings: AppSettings;
}

export function SettingsEditor({ settings }: Props) {
  const { locale } = useLocale();
  const [form, setForm] = useState({
    firma: settings.firma,
    org_nr: settings.org_nr ?? "",
    selskap_adresse: settings.selskap_adresse ?? "",
    selskap_postnr: settings.selskap_postnr ?? "",
    selskap_sted: settings.selskap_sted ?? "",
    selskap_telefon: settings.selskap_telefon ?? "",
    selskap_epost: settings.selskap_epost ?? "",
    installator_navn: settings.installator_navn ?? "",
    installator_tittel: settings.installator_tittel ?? "",
    installator_telefon: settings.installator_telefon ?? "",
    installator_epost: settings.installator_epost ?? "",
  });
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const res = await saveSettings(form);
      if (res?.error) {
        setStatus("error");
        setError(res.error);
      } else {
        setStatus("saved");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("adm_set_company", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={tr("adm_set_company_name", locale)} required>
              <Input
                value={form.firma}
                onChange={(e) => update("firma", e.target.value)}
                required
              />
            </Field>
            <Field label={tr("adm_set_org_nr", locale)}>
              <Input
                value={form.org_nr}
                onChange={(e) => update("org_nr", e.target.value)}
                placeholder="NO 920 322 433 MVA"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label={tr("adm_set_address", locale)}>
                <Input
                  value={form.selskap_adresse}
                  onChange={(e) => update("selskap_adresse", e.target.value)}
                />
              </Field>
            </div>
            <Field label={tr("adm_set_postal", locale)}>
              <Input
                value={form.selskap_postnr}
                onChange={(e) => update("selskap_postnr", e.target.value)}
              />
            </Field>
            <Field label={tr("adm_set_city", locale)}>
              <Input
                value={form.selskap_sted}
                onChange={(e) => update("selskap_sted", e.target.value)}
              />
            </Field>
            <Field label={tr("adm_set_phone", locale)}>
              <Input
                type="tel"
                value={form.selskap_telefon}
                onChange={(e) => update("selskap_telefon", e.target.value)}
              />
            </Field>
            <Field label={tr("adm_set_email", locale)}>
              <Input
                type="email"
                value={form.selskap_epost}
                onChange={(e) => update("selskap_epost", e.target.value)}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("adm_set_installer_title", locale)}</CardTitle>
          <p className="text-xs text-text-3 mt-1">
            {tr("adm_set_installer_note", locale)}
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={tr("adm_set_installer_name", locale)}>
              <Input
                value={form.installator_navn}
                onChange={(e) => update("installator_navn", e.target.value)}
              />
            </Field>
            <Field label={tr("adm_set_installer_role", locale)}>
              <Input
                value={form.installator_tittel}
                onChange={(e) => update("installator_tittel", e.target.value)}
                placeholder={tr("adm_set_installer_role_ph", locale)}
              />
            </Field>
            <Field label={tr("adm_set_phone", locale)}>
              <Input
                type="tel"
                value={form.installator_telefon}
                onChange={(e) => update("installator_telefon", e.target.value)}
              />
            </Field>
            <Field label={tr("adm_set_email", locale)}>
              <Input
                type="email"
                value={form.installator_epost}
                onChange={(e) => update("installator_epost", e.target.value)}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? tr("adm_set_saving", locale)
            : tr("adm_set_save", locale)}
        </Button>
        {status === "saved" && (
          <span className="text-sm text-green">{tr("adm_set_saved", locale)}</span>
        )}
        {status === "error" && error && (
          <span className="text-sm text-red">{error}</span>
        )}
      </div>
    </form>
  );
}
