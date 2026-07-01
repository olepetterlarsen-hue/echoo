"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, Pencil, Save, PenLine, ShieldCheck, X as XIcon } from "lucide-react";
import type {
  AppSettings,
  DocumentRow,
  Project,
  Profile,
} from "@/lib/types/database";
import { SAMSVAR_SIGNING_ROLES } from "@/lib/types/database";
import type {
  TemplateDef,
  FieldDef,
  YnaResponse,
  YnaMeasurementResponse,
  ContactSubformValue,
  ScopeSubformValue,
  AnvendteNormerValue,
  YnaAnswer,
  PersonItem,
  RiskRow,
  RiskColumn,
  RiskItem,
  RiskAssessmentResponse,
  RiskLevel,
} from "@/lib/document-templates/types";
import { Trash2, Plus as PlusIcon } from "lucide-react";
import { saveDraft, signDocument, startInternalControl } from "./actions";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { applyTokens } from "@/lib/document-templates/tokens";

interface Props {
  project: Project | null;
  template: TemplateDef;
  existing: DocumentRow | null;
  profile: Profile;
  samsvarVariant?: string;
  backHref?: string;
  backLabel?: string;
  settings?: AppSettings | null;
}

export function DocumentEditor({
  project,
  template,
  existing,
  profile,
  samsvarVariant,
  backHref,
  backLabel,
  settings = null,
}: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isSigned = existing?.status === "signert";
  const initialData = (existing?.data ?? {}) as Record<string, unknown>;

  // Lokal nøkkel for backup i localStorage — knyttet til prosjekt+kind+dokument-id
  // slik at separate dokumenter ikke kolliderer.
  const backupKey = `echoo:doc_draft:${project?.id ?? "standalone"}:${template.kind}:${existing?.id ?? "new"}`;

  const [data, setData] = useState<Record<string, unknown>>(() => {
    const seeded = project
      ? seedData(template, project, initialData, settings)
      : seedDataStandalone(template, initialData, settings);
    // Behold variant-info i data så den persisterer ved lagring
    if (samsvarVariant && !seeded._variant) {
      seeded._variant = samsvarVariant;
    }
    return seeded;
  });

  const [restorePrompt, setRestorePrompt] = useState<Record<string, unknown> | null>(null);
  const backupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // På mount: sjekk localStorage for ulagret backup (ikke for signerte dokumenter).
  useEffect(() => {
    if (isSigned) return;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(backupKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { data?: Record<string, unknown>; at?: string };
      if (parsed?.data && JSON.stringify(parsed.data) !== JSON.stringify(data)) {
        // Init fra localStorage på mount — setState er korrekt her.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRestorePrompt(parsed.data);
      }
    } catch {
      // ignorer korrupt backup
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupKey, isSigned]);

  // Debounced backup til localStorage på hver endring — beskytter mot tap ved
  // nettverksfeil eller utilsiktet navigasjon. Slettes ved vellykket lagring.
  useEffect(() => {
    if (isSigned) return;
    if (typeof window === "undefined") return;
    if (backupTimerRef.current) clearTimeout(backupTimerRef.current);
    backupTimerRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(
          backupKey,
          JSON.stringify({ data, at: new Date().toISOString() }),
        );
      } catch {
        // localStorage kan være full/disabled — ikke fatal
      }
    }, 800);
    return () => {
      if (backupTimerRef.current) clearTimeout(backupTimerRef.current);
    };
  }, [data, backupKey, isSigned]);

  function clearBackup() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(backupKey);
    } catch {
      // ignorer
    }
  }

  const updateField = (key: string, value: unknown) =>
    setData((d) => ({ ...d, [key]: value }));

  function onSave() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await saveDraft({
        projectId: project?.id ?? null,
        kind: template.kind,
        existingId: existing && !isSigned ? existing.id : null,
        data,
      });
      if (res.error) setError(res.error);
      else {
        setInfo(tr("proj_doc_saved_draft", locale));
        clearBackup();
        router.refresh();
      }
    });
  }

  function onSign() {
    if (!profile.signature_data_url) {
      setError(tr("proj_doc_no_signature_error", locale));
      return;
    }
    if (!confirm(tr("proj_doc_confirm_sign", locale))) {
      return;
    }
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await signDocument({
        projectId: project?.id ?? null,
        kind: template.kind,
        existingId: existing && !isSigned ? existing.id : null,
        data,
      });
      if (res.error) setError(res.error);
      else if (res.documentId) {
        clearBackup();
        router.push(project ? `/prosjekter/${project.id}` : "/skjemaer");
      }
    });
  }

  function onStartInternalControl() {
    if (!existing) return;
    if (!confirm(tr("proj_doc_confirm_internal_control", locale))) return;
    setError(null);
    startTransition(async () => {
      const res = await startInternalControl({ parentDocumentId: existing.id });
      if (res.error) setError(res.error);
      else if (res.documentId) {
        // Internkontroll: alltid vis via /skjemaer/[id] (siden flere
        // internkontroller kan finnes per prosjekt)
        router.push(`/skjemaer/${res.documentId}`);
        router.refresh();
      }
    });
  }

  function onNewVersion() {
    if (!confirm(tr("proj_doc_confirm_new_version", locale))) return;
    setError(null);
    startTransition(async () => {
      const res = await saveDraft({
        projectId: project?.id ?? null,
        kind: template.kind,
        existingId: null,
        data: (existing?.data as Record<string, unknown>) ?? {},
      });
      if (res.error) setError(res.error);
      else if (res.documentId) {
        router.push(
          project
            ? `/prosjekter/${project.id}/dokumenter/${template.kind}`
            : `/skjemaer/${res.documentId}`,
        );
        router.refresh();
      }
    });
  }

  const effectiveBackHref = backHref ?? (project ? `/prosjekter/${project.id}` : "/skjemaer");
  const effectiveBackLabel =
    backLabel ??
    (project
      ? tr("proj_doc_back_to_project", locale)
      : tr("proj_doc_back_to_forms", locale));
  const dateLocale = locale === "en" ? "en-GB" : "no-NO";

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="space-y-2">
        <Link
          href={effectiveBackHref}
          className="text-text-3 hover:text-text-1 text-sm"
        >
          ← {effectiveBackLabel}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{template.title}</h1>
            <p className="text-sm text-text-2">{template.subtitle}</p>
            <p className="text-xs text-text-3 mt-1 font-mono">
              {project
                ? `${project.project_number} · ${project.title} · ${template.revision}`
                : `${tr("proj_doc_standalone_label", locale)} · ${template.revision}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {existing && (
              <Badge tone={isSigned ? "green" : "yellow"}>
                v{existing.version} · {isSigned ? tr("proj_doc_signed", locale) : tr("proj_doc_draft", locale)}
              </Badge>
            )}
            {isSigned && existing?.pdf_path && (
              <Link href={`/api/documents/${existing.id}/pdf`} target="_blank">
                <Button size="sm">
                  <FileDown className="size-4" />
                  {tr("proj_doc_download_pdf", locale)}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {isSigned && (
        <Card className="border-green/30 bg-green/5">
          <CardBody className="flex items-start gap-3 flex-wrap">
            <div className="text-green mt-0.5">✓</div>
            <div className="flex-1 text-sm min-w-0">
              <p className="text-text-1">
                {existing.signed_at
                  ? tr("proj_doc_signed_banner", locale)
                      .replace("{v}", String(existing.version))
                      .replace(
                        "{date}",
                        new Date(existing.signed_at).toLocaleDateString(dateLocale),
                      )
                  : tr("proj_doc_signed_banner_no_date", locale).replace(
                      "{v}",
                      String(existing.version),
                    )}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {template.kind !== "internkontroll" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onStartInternalControl}
                  disabled={pending}
                  aria-label={tr("proj_doc_internal_control_title", locale)}
                  title={tr("proj_doc_internal_control_title", locale)}
                >
                  <ShieldCheck className="size-4" />
                  {tr("proj_doc_start_internal_control", locale)}
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={onNewVersion}>
                <Pencil className="size-4" />
                {tr("proj_doc_new_version", locale)}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {restorePrompt && !isSigned && (
        <Card className="border-yellow/30 bg-yellow/5">
          <CardBody className="flex items-start gap-3 flex-wrap">
            <div className="text-yellow mt-0.5">⏱</div>
            <div className="flex-1 text-sm min-w-0">
              <p className="text-text-1 font-medium">
                {tr("proj_doc_restore_title", locale)}
              </p>
              <p className="text-text-2 mt-0.5">
                {tr("proj_doc_restore_desc", locale)}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => {
                  if (restorePrompt) setData(restorePrompt);
                  setRestorePrompt(null);
                }}
              >
                {tr("proj_doc_restore_yes", locale)}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRestorePrompt(null);
                  clearBackup();
                }}
              >
                {tr("proj_doc_restore_no", locale)}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {template.sections.map((section, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            {section.description && (
              <p className="text-xs text-text-3 mt-1">{section.description}</p>
            )}
          </CardHeader>
          <CardBody className="space-y-4">
            {section.fields.map((field) => (
              <RenderField
                key={field.key}
                field={field}
                value={data[field.key]}
                onChange={(v) => updateField(field.key, v)}
                disabled={isSigned}
              />
            ))}
          </CardBody>
        </Card>
      ))}

      {error && (
        <div className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2 flex items-start gap-2">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red/70 hover:text-red shrink-0"
            aria-label={tr("dismiss", locale)}
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}
      {info && (
        <div className="text-sm text-green bg-green/10 border border-green/30 rounded px-3 py-2 flex items-start gap-2">
          <span className="flex-1">{info}</span>
          <button
            type="button"
            onClick={() => setInfo(null)}
            className="text-green/70 hover:text-green shrink-0"
            aria-label={tr("dismiss", locale)}
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}

      {!isSigned &&
        (() => {
          const isSamsvar = template.kind === "samsvarserklaering";
          const canSignSamsvar = SAMSVAR_SIGNING_ROLES.includes(profile.role);
          const samsvarBlocked = isSamsvar && !canSignSamsvar;
          const helpText = !profile.signature_data_url
            ? tr("proj_doc_help_no_signature", locale)
            : samsvarBlocked
              ? tr("proj_doc_help_samsvar_blocked", locale)
              : tr("proj_doc_help_ready", locale);
          return (
            <div
              className="flex flex-wrap items-center justify-end gap-3 sticky bg-bg/90 backdrop-blur p-3 rounded-lg border border-border"
              style={{
                // env(safe-area-inset-bottom) lar knappene unngå iOS-hjemstreken
                // og dukker ikke under tastaturet når brukeren skriver i felt.
                bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
              }}
            >
              <div className="flex flex-col mr-auto">
                <span className="text-xs text-text-3">{helpText}</span>
                <span className="text-[11px] text-text-3 italic">
                  {tr("proj_doc_no_time_limit", locale)}
                </span>
              </div>
              <Button variant="secondary" onClick={onSave} disabled={pending}>
                <Save className="size-4" />
                {pending ? tr("proj_doc_saving", locale) : tr("proj_doc_save_draft", locale)}
              </Button>
              <Button
                onClick={onSign}
                disabled={
                  pending || !profile.signature_data_url || samsvarBlocked
                }
              >
                <PenLine className="size-4" />
                {tr("proj_doc_sign_and_generate", locale)}
              </Button>
            </div>
          );
        })()}
    </div>
  );
}

// Bruk når dokumentet ikke har prosjekt — fyller bare default-verdier.
// Settings brukes til firma-tokens ($firma_navn, $installator_navn osv.).
function seedDataStandalone(
  template: TemplateDef,
  existing: Record<string, unknown>,
  settings: AppSettings | null,
): Record<string, unknown> {
  const data: Record<string, unknown> = { ...existing };
  for (const section of template.sections) {
    for (const field of section.fields) {
      if (data[field.key] !== undefined) continue;
      if (field.defaultValue !== undefined) {
        if (typeof field.defaultValue === "string") {
          data[field.key] = applyTokens(field.defaultValue, null, settings);
        } else {
          data[field.key] = field.defaultValue;
        }
      }
    }
  }
  return data;
}

function seedData(
  template: TemplateDef,
  project: Project,
  existing: Record<string, unknown>,
  settings: AppSettings | null,
): Record<string, unknown> {
  const data: Record<string, unknown> = { ...existing };
  for (const section of template.sections) {
    for (const field of section.fields) {
      if (data[field.key] !== undefined) continue;

      // Auto-fyll contact_subform fra prosjekt-kunde
      if (field.kind === "contact_subform" && field.prefillContact === "customer") {
        data[field.key] = {
          rolle: "annet",
          navn: project.customer_contact ?? "",
          telefon: project.customer_phone ?? "",
          epost: project.customer_email ?? "",
        };
        continue;
      }

      if (field.prefilledFrom) {
        const value = pickProjectValue(project, field.prefilledFrom);
        if (value) data[field.key] = value;
      } else if (field.defaultValue !== undefined) {
        // Hvis defaultValue er en streng som inneholder $-tokens, erstatt
        // dem med verdier fra Project + Settings. Ukjente tokens beholdes
        // som tekst så brukeren ser hva som mangler.
        if (typeof field.defaultValue === "string") {
          data[field.key] = applyTokens(field.defaultValue, project, settings);
        } else {
          data[field.key] = field.defaultValue;
        }
      }
    }
  }
  return data;
}

function pickProjectValue(
  p: Project,
  key: NonNullable<FieldDef["prefilledFrom"]>,
): string | null {
  const compact = (parts: (string | null | undefined)[]) =>
    parts.filter(Boolean).join(" ").trim() || null;

  switch (key) {
    case "project.title":
      return p.title;
    case "project.project_number":
      return p.project_number;
    case "project.description":
      return p.description;
    case "project.customer_name":
      return p.customer_name;
    case "project.customer_org_number":
      return p.customer_org_number;
    case "project.customer_contact":
      return p.customer_contact;
    case "project.customer_email":
      return p.customer_email;
    case "project.customer_phone":
      return p.customer_phone;
    case "project.customer_address":
      return p.customer_address;
    case "project.customer_postnr_sted":
      return compact([p.customer_postal_code, p.customer_city]);
    case "project.site_company":
      return p.site_company;
    case "project.site_address":
      return p.site_address;
    case "project.site_address_full":
      return compact([
        p.site_address,
        p.site_house_number,
        p.site_house_letter,
        p.site_postal_code
          ? `${p.site_postal_code} ${p.site_city ?? ""}`.trim()
          : p.site_city,
      ]);
    case "project.site_house_number":
      return p.site_house_number;
    case "project.site_house_letter":
      return p.site_house_letter;
    case "project.site_postal_code":
      return p.site_postal_code;
    case "project.site_city":
      return p.site_city;
    case "project.site_postnr_sted":
      return compact([p.site_postal_code, p.site_city]);
    case "project.site_ssb_number":
      return p.site_ssb_number;
    case "project.installation_type":
      return p.installation_type;
  }
}

function RenderField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const { locale } = useLocale();
  if (field.kind === "info") {
    return (
      <div className="text-sm text-text-2 italic border-l-2 border-orange/40 pl-3 bg-orange/5 py-2">
        {String(field.defaultValue ?? "")}
      </div>
    );
  }

  if (field.kind === "yna_group") {
    return (
      <YnaGroup
        items={field.items ?? []}
        value={(value as Record<string, YnaResponse>) ?? {}}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  if (field.kind === "yna_measurement_group") {
    return (
      <YnaMeasurementGroup
        items={field.items ?? []}
        header={field.measurementHeader ?? "Verdi"}
        value={(value as Record<string, YnaMeasurementResponse>) ?? {}}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  if (field.kind === "contact_subform") {
    return (
      <ContactSubform
        value={(value as ContactSubformValue) ?? defaultContact()}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  if (field.kind === "scope_subform") {
    return (
      <ScopeSubform
        value={(value as ScopeSubformValue) ?? { type: null, anleggsdel: "" }}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  if (field.kind === "anvendte_normer_subform") {
    return (
      <AnvendteNormerSubform
        value={
          (value as AnvendteNormerValue) ?? {
            nek400: false,
            nek400_utg: "",
            annet: "",
          }
        }
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  if (field.kind === "people_list") {
    return (
      <PeopleList
        value={(value as PersonItem[]) ?? []}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  if (field.kind === "risk_table") {
    return (
      <RiskTable
        columns={field.columns ?? []}
        value={(value as RiskRow[]) ?? []}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  if (field.kind === "risk_assessment_group") {
    return (
      <RiskAssessmentGroup
        items={field.riskItems ?? []}
        value={(value as Record<string, RiskAssessmentResponse>) ?? {}}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  if (field.kind === "yes_no") {
    return (
      <Field label={field.label} required={field.required} hint={field.hint}>
        <div className="flex gap-2">
          {(["JA", "NEI"] as const).map((opt) => {
            const active = value === opt;
            const tone =
              opt === "JA"
                ? active
                  ? "bg-green text-bg border-green"
                  : "bg-card border-border hover:bg-card-hover"
                : active
                  ? "bg-red text-white border-red"
                  : "bg-card border-border hover:bg-card-hover";
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                disabled={disabled}
                className={`px-4 h-9 rounded-md text-sm font-semibold border transition-colors disabled:opacity-60 ${tone}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </Field>
    );
  }

  if (field.kind === "radio") {
    return (
      <Field label={field.label} required={field.required} hint={field.hint}>
        <div className="flex flex-wrap gap-3">
          {field.options?.map((o) => (
            <label key={o} className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.key}
                checked={value === o}
                onChange={() => onChange(o)}
                disabled={disabled}
                className="size-4 accent-orange"
              />
              {o}
            </label>
          ))}
        </div>
      </Field>
    );
  }

  if (field.kind === "checkmark_group") {
    const arr = ((value as string[]) ?? []) as string[];
    return (
      <Field label={field.label} hint={field.hint}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {field.options?.map((o) => {
            const checked = arr.includes(o);
            return (
              <label
                key={o}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const newArr = e.target.checked
                      ? [...arr, o]
                      : arr.filter((x) => x !== o);
                    onChange(newArr);
                  }}
                  disabled={disabled}
                  className="size-4 accent-orange"
                />
                {o}
              </label>
            );
          })}
        </div>
      </Field>
    );
  }

  return (
    <Field label={field.label} required={field.required} hint={field.hint}>
      {field.kind === "text" && (
        <Input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}
      {field.kind === "textarea" && (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={4}
        />
      )}
      {field.kind === "number" && (
        <Input
          type="number"
          step="any"
          value={(value as number | string) ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          disabled={disabled}
        />
      )}
      {field.kind === "date" && (
        <Input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}
      {field.kind === "select" && (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none disabled:opacity-60"
        >
          <option value="">{tr("proj_doc_select_placeholder", locale)}</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
      {field.kind === "checkbox" && (
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="size-4 accent-orange"
          />
          <span className="text-sm">{tr("proj_doc_checkbox_yes", locale)}</span>
        </label>
      )}
    </Field>
  );
}

function YnaGroup({
  items,
  value,
  onChange,
  disabled,
}: {
  items: { key: string; label: string }[];
  value: Record<string, YnaResponse>;
  onChange: (v: Record<string, YnaResponse>) => void;
  disabled: boolean;
}) {
  const { locale } = useLocale();
  function setItem(itemKey: string, patch: Partial<YnaResponse>) {
    const current = value[itemKey] ?? { svar: null, kommentar: "" };
    onChange({
      ...value,
      [itemKey]: { ...current, ...patch },
    });
  }

  function markAllUakt() {
    const next: Record<string, YnaResponse> = { ...value };
    for (const item of items) {
      next[item.key] = {
        ...(value[item.key] ?? { kommentar: "" }),
        svar: "uakt",
      };
    }
    onChange(next);
  }

  const OPTIONS: { value: YnaAnswer; labelKey: Parameters<typeof tr>[0] }[] = [
    { value: "ja", labelKey: "proj_doc_field_yes" },
    { value: "nei", labelKey: "proj_doc_field_no" },
    { value: "uakt", labelKey: "proj_doc_field_na" },
  ];

  return (
    <div className="-mx-5 sm:mx-0">
      {!disabled && items.length > 1 && (
        <div className="px-5 pb-2 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (
                confirm(tr("proj_doc_mark_all_uakt_confirm", locale))
              ) {
                markAllUakt();
              }
            }}
            className="text-xs text-text-3 hover:text-orange underline"
          >
            {tr("proj_doc_mark_all_uakt", locale)}
          </button>
        </div>
      )}

      {/* Mobil: kort-stack — store touch-target-knapper for hånd/hanske-bruk */}
      <div className="sm:hidden space-y-3 px-5">
        {items.map((item) => {
          const r = value[item.key] ?? { svar: null, kommentar: "" };
          return (
            <div
              key={item.key}
              className="border border-border rounded-md bg-card p-3 space-y-2"
            >
              <div className="text-sm text-text-1">{item.label}</div>
              <div className="grid grid-cols-3 gap-2">
                {OPTIONS.map((opt) => {
                  const active = r.svar === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setItem(item.key, { svar: opt.value })}
                      disabled={disabled}
                      className={`min-h-[44px] rounded-md text-sm font-medium border transition-colors ${
                        active
                          ? "bg-orange text-bg border-orange"
                          : "bg-surface text-text-2 border-border hover:bg-card-hover"
                      } disabled:opacity-50`}
                    >
                      {tr(opt.labelKey, locale)}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={r.kommentar}
                onChange={(e) => setItem(item.key, { kommentar: e.target.value })}
                disabled={disabled}
                placeholder={tr("proj_doc_field_comment", locale)}
                className="w-full h-10 rounded-md px-3 text-base bg-surface border border-border focus:border-orange focus:outline-none"
              />
            </div>
          );
        })}
      </div>

      {/* Desktop: kompakt tabell — bevarer tett oversikt på store skjermer */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-text-3 border-b border-border">
            <tr>
              <th className="text-left px-5 py-2 font-medium">{tr("proj_doc_field_question", locale)}</th>
              <th className="w-12 text-center py-2 font-medium">{tr("proj_doc_field_yes", locale)}</th>
              <th className="w-12 text-center py-2 font-medium">{tr("proj_doc_field_no", locale)}</th>
              <th className="w-12 text-center py-2 font-medium">{tr("proj_doc_field_na", locale)}</th>
              <th className="w-1/3 text-left px-3 py-2 font-medium">{tr("proj_doc_field_comment", locale)}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const r = value[item.key] ?? { svar: null, kommentar: "" };
              return (
                <tr key={item.key} className="align-top">
                  <td className="px-5 py-2 text-text-1">{item.label}</td>
                  {(["ja", "nei", "uakt"] as YnaAnswer[]).map((opt) => (
                    <td key={opt} className="text-center py-2">
                      <input
                        type="radio"
                        name={`yna_${item.key}`}
                        checked={r.svar === opt}
                        onChange={() => setItem(item.key, { svar: opt })}
                        disabled={disabled}
                        className="size-4 accent-orange cursor-pointer"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={r.kommentar}
                      onChange={(e) =>
                        setItem(item.key, { kommentar: e.target.value })
                      }
                      disabled={disabled}
                      className="w-full h-8 rounded px-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function YnaMeasurementGroup({
  items,
  header,
  value,
  onChange,
  disabled,
}: {
  items: { key: string; label: string }[];
  header: string;
  value: Record<string, YnaMeasurementResponse>;
  onChange: (v: Record<string, YnaMeasurementResponse>) => void;
  disabled: boolean;
}) {
  const { locale } = useLocale();
  function setItem(itemKey: string, patch: Partial<YnaMeasurementResponse>) {
    const current = value[itemKey] ?? { svar: null, kommentar: "", verdi: "" };
    onChange({
      ...value,
      [itemKey]: { ...current, ...patch },
    });
  }

  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wider text-text-3 border-b border-border">
          <tr>
            <th className="text-left px-5 py-2 font-medium">{tr("proj_doc_field_question", locale)}</th>
            <th className="w-12 text-center py-2 font-medium">{tr("proj_doc_field_yes", locale)}</th>
            <th className="w-12 text-center py-2 font-medium">{tr("proj_doc_field_no", locale)}</th>
            <th className="w-12 text-center py-2 font-medium">{tr("proj_doc_field_na", locale)}</th>
            <th className="w-1/4 text-left px-3 py-2 font-medium">{tr("proj_doc_field_comment", locale)}</th>
            <th className="w-24 text-left px-3 py-2 font-medium">{header}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => {
            const r = value[item.key] ?? { svar: null, kommentar: "", verdi: "" };
            return (
              <tr key={item.key} className="align-top">
                <td className="px-5 py-2 text-text-1">{item.label}</td>
                {(["ja", "nei", "uakt"] as YnaAnswer[]).map((opt) => (
                  <td key={opt} className="text-center py-2">
                    <input
                      type="radio"
                      name={`ynam_${item.key}`}
                      checked={r.svar === opt}
                      onChange={() => setItem(item.key, { svar: opt })}
                      disabled={disabled}
                      className="size-4 accent-orange cursor-pointer"
                    />
                  </td>
                ))}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={r.kommentar}
                    onChange={(e) =>
                      setItem(item.key, { kommentar: e.target.value })
                    }
                    disabled={disabled}
                    className="w-full h-8 rounded px-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={r.verdi}
                    onChange={(e) =>
                      setItem(item.key, { verdi: e.target.value })
                    }
                    disabled={disabled}
                    className="w-full h-8 rounded px-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function defaultContact(): ContactSubformValue {
  return { rolle: null, navn: "", telefon: "", epost: "" };
}

function ContactSubform({
  value,
  onChange,
  disabled,
}: {
  value: ContactSubformValue;
  onChange: (v: ContactSubformValue) => void;
  disabled: boolean;
}) {
  const { locale } = useLocale();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        {(["eier", "bruker", "annet"] as const).map((r) => (
          <label key={r} className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="kontakt_rolle"
              checked={value.rolle === r}
              onChange={() => onChange({ ...value, rolle: r })}
              disabled={disabled}
              className="size-4 accent-orange"
            />
            <span className="capitalize">{r}</span>
          </label>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label={tr("proj_doc_contact_field_name", locale)}>
          <Input
            value={value.navn}
            onChange={(e) => onChange({ ...value, navn: e.target.value })}
            disabled={disabled}
          />
        </Field>
        <Field label={tr("proj_doc_contact_field_phone", locale)}>
          <Input
            type="tel"
            value={value.telefon}
            onChange={(e) => onChange({ ...value, telefon: e.target.value })}
            disabled={disabled}
          />
        </Field>
        <Field label={tr("proj_doc_contact_field_email", locale)}>
          <Input
            type="email"
            value={value.epost}
            onChange={(e) => onChange({ ...value, epost: e.target.value })}
            disabled={disabled}
          />
        </Field>
      </div>
    </div>
  );
}

function ScopeSubform({
  value,
  onChange,
  disabled,
}: {
  value: ScopeSubformValue;
  onChange: (v: ScopeSubformValue) => void;
  disabled: boolean;
}) {
  const { locale } = useLocale();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="omfang_type"
            checked={value.type === "hele"}
            onChange={() => onChange({ ...value, type: "hele" })}
            disabled={disabled}
            className="size-4 accent-orange"
          />
          {tr("proj_doc_scope_whole", locale)}
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="omfang_type"
            checked={value.type === "del"}
            onChange={() => onChange({ ...value, type: "del" })}
            disabled={disabled}
            className="size-4 accent-orange"
          />
          {tr("proj_doc_scope_part", locale)}
        </label>
      </div>
      {value.type === "del" && (
        <Field label={tr("proj_doc_scope_part_desc", locale)}>
          <Input
            value={value.anleggsdel}
            onChange={(e) => onChange({ ...value, anleggsdel: e.target.value })}
            disabled={disabled}
          />
        </Field>
      )}
    </div>
  );
}

function PeopleList({
  value,
  onChange,
  disabled,
}: {
  value: PersonItem[];
  onChange: (v: PersonItem[]) => void;
  disabled: boolean;
}) {
  const { locale } = useLocale();
  function update(idx: number, patch: Partial<PersonItem>) {
    onChange(value.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }
  function add() {
    onChange([...value, { navn: "", rolle: "" }]);
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }
  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-xs text-text-3">{tr("proj_doc_people_empty", locale)}</p>
      )}
      {value.map((p, i) => (
        <div
          key={i}
          className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:items-center"
        >
          <input
            value={p.navn}
            onChange={(e) => update(i, { navn: e.target.value })}
            disabled={disabled}
            placeholder={tr("proj_doc_people_name_placeholder", locale)}
            className="sm:col-span-6 h-10 sm:h-9 rounded px-2 text-base sm:text-sm bg-surface border border-border focus:border-orange focus:outline-none"
          />
          <div className="flex gap-2 items-center sm:contents">
            <input
              value={p.rolle}
              onChange={(e) => update(i, { rolle: e.target.value })}
              disabled={disabled}
              placeholder={tr("proj_doc_people_role_placeholder", locale)}
              className="flex-1 sm:col-span-5 h-10 sm:h-9 rounded px-2 text-base sm:text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="sm:col-span-1 size-10 sm:size-9 shrink-0 text-text-3 hover:text-red flex items-center justify-center"
                aria-label={tr("proj_doc_remove", locale)}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={add}
          className="text-sm text-orange hover:underline inline-flex items-center gap-1"
        >
          <PlusIcon className="size-4" /> {tr("proj_doc_add_person", locale)}
        </button>
      )}
    </div>
  );
}

function RiskTable({
  columns,
  value,
  onChange,
  disabled,
}: {
  columns: RiskColumn[];
  value: RiskRow[];
  onChange: (v: RiskRow[]) => void;
  disabled: boolean;
}) {
  const { locale } = useLocale();
  function update(idx: number, key: string, val: string) {
    onChange(value.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));
  }
  function add() {
    const empty: RiskRow = Object.fromEntries(columns.map((c) => [c.key, ""]));
    onChange([...value, empty]);
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function colWidth(w: RiskColumn["width"]): string {
    if (w === "narrow") return "w-12";
    if (w === "wide") return "min-w-[180px]";
    return "min-w-[120px]";
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-text-3 border-b border-border">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`text-left px-2 py-2 font-medium ${colWidth(c.width)}`}
                >
                  {c.label}
                </th>
              ))}
              {!disabled && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {value.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (disabled ? 0 : 1)}
                  className="text-center py-3 text-text-3 text-xs"
                >
                  {tr("proj_doc_risk_empty", locale)}
                </td>
              </tr>
            )}
            {value.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-2 py-1 ${colWidth(c.width)}`}>
                    <input
                      value={row[c.key] ?? ""}
                      onChange={(e) => update(i, c.key, e.target.value)}
                      disabled={disabled}
                      className="w-full h-8 rounded px-2 text-xs bg-surface border border-border focus:border-orange focus:outline-none"
                    />
                  </td>
                ))}
                {!disabled && (
                  <td className="text-center">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="text-text-3 hover:text-red"
                      aria-label={tr("proj_doc_remove_row", locale)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={add}
          className="text-sm text-orange hover:underline inline-flex items-center gap-1 px-5"
        >
          <PlusIcon className="size-4" /> {tr("proj_doc_add_row", locale)}
        </button>
      )}
      <p className="text-xs text-text-3 px-5">
        {tr("proj_doc_risk_legend", locale)}
      </p>
    </div>
  );
}

function RiskAssessmentGroup({
  items,
  value,
  onChange,
  disabled,
}: {
  items: RiskItem[];
  value: Record<string, RiskAssessmentResponse>;
  onChange: (v: Record<string, RiskAssessmentResponse>) => void;
  disabled: boolean;
}) {
  const { locale } = useLocale();
  function setItem(itemKey: string, patch: Partial<RiskAssessmentResponse>) {
    const current = value[itemKey] ?? { level: null, besvarelse: "" };
    onChange({ ...value, [itemKey]: { ...current, ...patch } });
  }

  const LEVELS: { value: RiskLevel; label: string; tone: string }[] = [
    {
      value: "lav",
      label: tr("proj_doc_risk_lav", locale),
      tone: "bg-green/15 text-green border-green/40",
    },
    {
      value: "middels",
      label: tr("proj_doc_risk_middels", locale),
      tone: "bg-yellow/15 text-yellow border-yellow/40",
    },
    {
      value: "hoey",
      label: tr("proj_doc_risk_hoey", locale),
      tone: "bg-red/15 text-red border-red/40",
    },
    {
      value: "ikke_aktuelt",
      label: tr("proj_doc_risk_na", locale),
      tone: "bg-card-hover text-text-2 border-border",
    },
  ];

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const r = value[item.key] ?? { level: null, besvarelse: "" };
        return (
          <div
            key={item.key}
            className="border border-border rounded-md p-3 space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text-1">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-text-3 mt-1">
                    {item.description}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-1">
                {LEVELS.map((l) => {
                  const active = r.level === l.value;
                  return (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setItem(item.key, { level: l.value })}
                      disabled={disabled}
                      className={`min-h-[44px] sm:min-h-0 px-3 sm:px-2.5 py-2 sm:py-1 text-sm sm:text-xs rounded border font-medium transition-colors disabled:opacity-60 ${
                        active
                          ? l.tone
                          : "bg-card text-text-2 border-border hover:bg-card-hover"
                      }`}
                    >
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <textarea
              value={r.besvarelse}
              onChange={(e) =>
                setItem(item.key, { besvarelse: e.target.value })
              }
              disabled={disabled}
              rows={2}
              placeholder={tr("proj_doc_risk_response_placeholder", locale)}
              className="w-full rounded px-2 py-1.5 text-base sm:text-sm bg-surface border border-border focus:border-orange focus:outline-none"
            />
          </div>
        );
      })}
    </div>
  );
}

function AnvendteNormerSubform({
  value,
  onChange,
  disabled,
}: {
  value: AnvendteNormerValue;
  onChange: (v: AnvendteNormerValue) => void;
  disabled: boolean;
}) {
  const { locale } = useLocale();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.nek400}
            onChange={(e) => onChange({ ...value, nek400: e.target.checked })}
            disabled={disabled}
            className="size-4 accent-orange"
          />
          NEK 400
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-2">{tr("proj_doc_norms_edition", locale)}</span>
          <input
            type="text"
            value={value.nek400_utg}
            onChange={(e) =>
              onChange({ ...value, nek400_utg: e.target.value })
            }
            disabled={disabled || !value.nek400}
            placeholder={tr("proj_doc_norms_edition_placeholder", locale)}
            className="h-8 w-24 rounded px-2 text-sm bg-surface border border-border focus:border-orange focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>
      <Field label={tr("proj_doc_norms_other", locale)} hint={tr("proj_doc_norms_other_hint", locale)}>
        <Input
          value={value.annet}
          onChange={(e) => onChange({ ...value, annet: e.target.value })}
          disabled={disabled}
        />
      </Field>
    </div>
  );
}
