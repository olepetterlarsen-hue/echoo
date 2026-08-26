// Rene hjelpefunksjoner for mal-variant og required-felt-validering — INGEN
// avhengighet til @/lib/supabase/server (i motsetning til ./index.ts), slik
// at klientkomponenter (document-editor.tsx) kan importere dem direkte uten
// å dra inn next/headers i klient-bundlen.
import type { DocumentKind, InstallationType } from "@/lib/types/database";
import type { TemplateDef, FieldDef } from "./types";

export type SjaVariant = "standard" | "telekom";

export function sjaVariantFromInstallationType(
  type: InstallationType | null | undefined,
): SjaVariant {
  return type === "telecom" ? "telekom" : "standard";
}

/**
 * Utleder hvilken mal-variant et dokument skal bruke, ut fra lagret
 * _variant/_template_id på dataen og prosjektets installation_type.
 * Delt mellom PDF-rendering (render.tsx) og server-side validering ved
 * signering (actions.ts) — må ALLTID gi samme svar begge steder, ellers
 * kan man validere mot én mal og rendre en annen.
 */
export function resolveTemplateVariant(
  kind: DocumentKind,
  data: Record<string, unknown>,
  installationType: InstallationType | null | undefined,
): string | undefined {
  const storedVariant = typeof data._variant === "string" ? data._variant : undefined;
  const storedTemplateId =
    typeof data._template_id === "string" ? data._template_id : undefined;
  if (kind === "samsvarserklaering") {
    return storedVariant ?? installationType ?? "bolig";
  }
  if (kind === "sja") {
    return storedVariant ?? sjaVariantFromInstallationType(installationType);
  }
  if (kind === "custom") {
    return storedTemplateId;
  }
  return undefined;
}

function isFieldAnswered(kind: FieldDef["kind"], value: unknown): boolean {
  if (kind === "checkbox") return value === true;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

/**
 * A5/I-39: finner alle required-felt uten verdi. Brukt av BÅDE server-siden
 * (actions.ts, fasit) og klienten (document-editor.tsx, rask feedback) —
 * samme funksjon så de aldri kan avvike om hva som telles som "besvart".
 * Kun enkle feltkinder (text/textarea/number/date/select/radio/checkbox)
 * har i praksis required:true i noen mal i dag — gruppe-kinder som
 * yna_group har uklar required-semantikk og er bevisst ikke håndtert her.
 */
export function findMissingRequiredFields(
  template: TemplateDef,
  data: Record<string, unknown>,
): FieldDef[] {
  const missing: FieldDef[] = [];
  for (const section of template.sections) {
    for (const field of section.fields) {
      if (field.required && !isFieldAnswered(field.kind, data[field.key])) {
        missing.push(field);
      }
    }
  }
  return missing;
}
