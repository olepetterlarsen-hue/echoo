"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, FileDown } from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { GHS_PICTOGRAMS, GHS_ORDER, type GhsCode } from "@/lib/ghs-pictograms";
import { upsertSubstance, deleteSubstance, getSdsSignedUrl } from "./actions";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface Substance {
  id: string;
  name: string;
  manufacturer: string | null;
  cas_number: string | null;
  usage_area: string | null;
  storage_location: string | null;
  ghs_pictograms: string[];
  hazard_statements: string | null;
  precautionary_measures: string | null;
  sds_file_path: string | null;
  sds_revision_date: string | null;
  quantity_estimate: string | null;
  notes: string | null;
  active: boolean;
}

interface Props {
  mode: "create" | "edit";
  substance?: Substance;
}

export function SubstanceForm({ mode, substance }: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: substance?.name ?? "",
    manufacturer: substance?.manufacturer ?? "",
    cas_number: substance?.cas_number ?? "",
    usage_area: substance?.usage_area ?? "",
    storage_location: substance?.storage_location ?? "",
    hazard_statements: substance?.hazard_statements ?? "",
    precautionary_measures: substance?.precautionary_measures ?? "",
    quantity_estimate: substance?.quantity_estimate ?? "",
    notes: substance?.notes ?? "",
    sds_revision_date: substance?.sds_revision_date ?? "",
    active: substance?.active ?? true,
  });
  const [pictograms, setPictograms] = useState<GhsCode[]>(
    (substance?.ghs_pictograms ?? []) as GhsCode[],
  );
  const [sdsPath, setSdsPath] = useState<string | null>(
    substance?.sds_file_path ?? null,
  );

  function toggleGhs(code: GhsCode) {
    setPictograms((curr) =>
      curr.includes(code) ? curr.filter((c) => c !== code) : [...curr, code],
    );
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onFileSelected(file: File) {
    setError(null);
    setUploading(true);
    try {
      const supabase = createBrowserClient();
      const ext = file.name.split(".").pop() ?? "pdf";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${fileName}`;
      const { error: uploadErr } = await supabase.storage
        .from("substance-sds")
        .upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;
      setSdsPath(path);
    } catch (e) {
      setError(
        tr("subs_err_upload", locale).replace("{msg}", (e as Error).message),
      );
    } finally {
      setUploading(false);
    }
  }

  async function onOpenSds() {
    if (!sdsPath) return;
    const res = await getSdsSignedUrl({ path: sdsPath });
    if (res.url) window.open(res.url, "_blank");
  }

  async function onRemoveSds() {
    if (!sdsPath) return;
    if (!confirm(tr("subs_confirm_remove_sds", locale))) return;
    const supabase = createBrowserClient();
    await supabase.storage.from("substance-sds").remove([sdsPath]);
    setSdsPath(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await upsertSubstance({
        id: substance?.id,
        name: form.name,
        manufacturer: form.manufacturer,
        cas_number: form.cas_number,
        usage_area: form.usage_area,
        storage_location: form.storage_location,
        ghs_pictograms: pictograms,
        hazard_statements: form.hazard_statements,
        precautionary_measures: form.precautionary_measures,
        sds_file_path: sdsPath,
        sds_revision_date: form.sds_revision_date || null,
        quantity_estimate: form.quantity_estimate,
        notes: form.notes,
        active: form.active,
      });
      if (res.error) setError(res.error);
      else if (res.id) router.push(`/stoffkartotek/${res.id}`);
    });
  }

  function onDelete() {
    if (!substance) return;
    if (
      !confirm(
        tr("subs_confirm_delete", locale).replace("{name}", substance.name),
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteSubstance({ id: substance.id });
      if (res.error) setError(res.error);
      else router.push("/stoffkartotek");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("subs_section_substance", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={tr("subs_field_trade_name", locale)} required>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={tr("subs_field_manufacturer", locale)}>
              <Input
                value={form.manufacturer}
                onChange={(e) => update("manufacturer", e.target.value)}
              />
            </Field>
            <Field
              label={tr("subs_field_cas", locale)}
              hint={tr("subs_field_cas_hint", locale)}
            >
              <Input
                value={form.cas_number}
                onChange={(e) => update("cas_number", e.target.value)}
              />
            </Field>
            <Field label={tr("subs_field_usage", locale)}>
              <Input
                value={form.usage_area}
                onChange={(e) => update("usage_area", e.target.value)}
                placeholder={tr("subs_field_usage_placeholder", locale)}
              />
            </Field>
            <Field label={tr("subs_field_storage", locale)}>
              <Input
                value={form.storage_location}
                onChange={(e) => update("storage_location", e.target.value)}
                placeholder={tr("subs_field_storage_placeholder", locale)}
              />
            </Field>
            <Field
              label={tr("subs_field_quantity", locale)}
              hint={tr("subs_field_quantity_hint", locale)}
            >
              <Input
                value={form.quantity_estimate}
                onChange={(e) => update("quantity_estimate", e.target.value)}
                placeholder={tr("subs_field_quantity_placeholder", locale)}
              />
            </Field>
            <Field
              label={tr("subs_field_sds_revision", locale)}
              hint={tr("subs_field_sds_revision_hint", locale)}
            >
              <Input
                type="date"
                value={form.sds_revision_date}
                onChange={(e) => update("sds_revision_date", e.target.value)}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("subs_section_ghs", locale)}</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-xs text-text-3 mb-3">
            {tr("subs_ghs_help", locale)}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GHS_ORDER.map((code) => {
              const info = GHS_PICTOGRAMS[code];
              const active = pictograms.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleGhs(code)}
                  className={`flex items-center gap-3 p-3 rounded-md border-2 text-left transition-colors ${
                    active
                      ? "bg-card-hover"
                      : "bg-card border-border hover:bg-card-hover"
                  }`}
                  style={{
                    borderColor: active ? info.color : undefined,
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center size-9 rounded text-base font-bold border-2 shrink-0"
                    style={{
                      borderColor: info.color,
                      color: info.color,
                    }}
                  >
                    {info.short}
                  </span>
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium ${active ? "text-text-1" : "text-text-2"}`}
                    >
                      {locale === "en" ? info.label_en : info.label_no}
                    </div>
                    <div className="text-[10px] text-text-3 truncate">
                      {info.code}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("subs_section_hazards", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field
            label={tr("subs_field_h_statements", locale)}
            hint={tr("subs_field_h_statements_hint", locale)}
          >
            <Textarea
              value={form.hazard_statements}
              onChange={(e) => update("hazard_statements", e.target.value)}
              rows={2}
              placeholder={tr("subs_field_h_statements_placeholder", locale)}
            />
          </Field>
          <Field
            label={tr("subs_field_p_statements", locale)}
            hint={tr("subs_field_p_statements_hint", locale)}
          >
            <Textarea
              value={form.precautionary_measures}
              onChange={(e) => update("precautionary_measures", e.target.value)}
              rows={3}
              placeholder={tr("subs_field_p_statements_placeholder", locale)}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("subs_section_sds", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {sdsPath ? (
            <div className="flex items-center justify-between gap-3 p-3 bg-card border border-border rounded-md">
              <span className="text-sm text-text-1 flex items-center gap-2">
                <FileDown className="size-4 text-green" />
                {tr("subs_sds_uploaded", locale)}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={onOpenSds}
                >
                  {tr("subs_sds_open", locale)}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onRemoveSds}
                  className="text-red hover:bg-red/10"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFileSelected(f);
                }}
                disabled={uploading}
                className="block w-full text-sm text-text-2 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-orange file:text-bg file:cursor-pointer"
              />
              {uploading && (
                <p className="text-xs text-text-3 mt-2 flex items-center gap-1">
                  <Upload className="size-3 animate-pulse" />
                  {tr("subs_sds_uploading", locale)}
                </p>
              )}
              <p className="text-xs text-text-3 mt-2">
                {tr("subs_sds_pdf_hint", locale)}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("subs_section_notes", locale)}</CardTitle>
        </CardHeader>
        <CardBody>
          <Field label={tr("subs_field_internal_notes", locale)}>
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
              <span className="text-sm">{tr("subs_active_label", locale)}</span>
            </label>
            <p className="text-xs text-text-3 mt-1">
              {tr("subs_inactive_hint", locale)}
            </p>
          </CardBody>
        </Card>
      )}

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
            {tr("subs_delete_button", locale)}
          </Button>
        )}
        <div className="flex gap-3 ml-auto">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            {tr("cancel", locale)}
          </Button>
          <Button type="submit" disabled={pending || uploading}>
            {pending
              ? tr("subs_saving", locale)
              : mode === "create"
                ? tr("subs_create_submit", locale)
                : tr("subs_edit_submit", locale)}
          </Button>
        </div>
      </div>
    </form>
  );
}
