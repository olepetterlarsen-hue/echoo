import type { DocumentKind, InstallationType } from "@/lib/types/database";
import type { TemplateDef, SectionDef } from "./types";
import { RISIKOVURDERING } from "./risikovurdering";
import { SLUTTKONTROLL } from "./sluttkontroll";
import { FORENKLET_SIKKERHET } from "./forenklet-sikkerhet";
import { SJA } from "./sja";
import { SJA_TELEKOM } from "./sja-telekom";
import { RUH } from "./ruh";
import { STARTUP_CHECKLIST } from "./startup-checklist";
import { STIKKPROVEKONTROLL } from "./stikkprovekontroll";
import { INTERNKONTROLL } from "./internkontroll";
import { SAMSVAR_BOLIG } from "./samsvar/bolig";
import { SAMSVAR_NAERING } from "./samsvar/naering";
import { SAMSVAR_TELECOM } from "./samsvar/telecom";
import { SAMSVAR_EV } from "./samsvar/ev";
import { createClient } from "@/lib/supabase/server";

export type SamsvarVariant = "bolig" | "naering" | "telecom" | "ev";

// Mapping fra prosjektets installation_type til Samsvar-variant.
export function variantFromInstallationType(
  type: InstallationType | null | undefined,
): SamsvarVariant {
  if (!type) return "bolig";
  return type;
}

// 4 Samsvar-varianter — alle deler kind = "samsvarserklaering" i DB.
export const SAMSVAR_VARIANTS: Record<SamsvarVariant, TemplateDef> = {
  bolig: SAMSVAR_BOLIG,
  naering: SAMSVAR_NAERING,
  telecom: SAMSVAR_TELECOM,
  ev: SAMSVAR_EV,
};

// 2 SJA-varianter: standard (bolig/næring/EV) og telekom (ROT741).
export type SjaVariant = "standard" | "telekom";
export const SJA_VARIANTS: Record<SjaVariant, TemplateDef> = {
  standard: SJA,
  telekom: SJA_TELEKOM,
};

export function sjaVariantFromInstallationType(
  type: InstallationType | null | undefined,
): SjaVariant {
  return type === "telecom" ? "telekom" : "standard";
}

// Tomt fallback-mal for custom kind når template_id mangler.
const CUSTOM_EMPTY: TemplateDef = {
  kind: "custom",
  title: "Egendefinert skjema",
  subtitle: "Skjema-malen ble ikke funnet",
  revision: "v1.0",
  sections: [],
};

export const DEFAULT_TEMPLATES: Record<DocumentKind, TemplateDef> = {
  risikovurdering: RISIKOVURDERING,
  sluttkontroll: SLUTTKONTROLL,
  samsvarserklaering: SAMSVAR_BOLIG,
  forenklet_sikkerhet: FORENKLET_SIKKERHET,
  sja: SJA,
  ruh: RUH,
  startup_checklist: STARTUP_CHECKLIST,
  stikkprovekontroll: STIKKPROVEKONTROLL,
  internkontroll: INTERNKONTROLL,
  custom: CUSTOM_EMPTY,
};

// Synkron lookup — alltid hardkodet default.
export function templateFor(kind: DocumentKind, variant?: string): TemplateDef {
  if (kind === "samsvarserklaering" && variant && variant in SAMSVAR_VARIANTS) {
    return SAMSVAR_VARIANTS[variant as SamsvarVariant];
  }
  if (kind === "sja" && variant && variant in SJA_VARIANTS) {
    return SJA_VARIANTS[variant as SjaVariant];
  }
  return DEFAULT_TEMPLATES[kind];
}

// Hent kinds som er skjult av admin.
export async function getHiddenKinds(): Promise<Set<DocumentKind>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("document_templates")
      .select("kind")
      .eq("is_hidden", true);
    return new Set((data ?? []).map((r) => r.kind));
  } catch {
    return new Set();
  }
}

// Async lookup. For custom kind: variant = template_id i custom_templates.
export async function getTemplate(
  kind: DocumentKind,
  variant?: string,
): Promise<TemplateDef> {
  if (kind === "custom") {
    if (!variant) return CUSTOM_EMPTY;
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("custom_templates")
        .select("*")
        .eq("id", variant)
        .maybeSingle();
      if (data) return customTemplateToDef(data);
    } catch {
      // ignore
    }
    return CUSTOM_EMPTY;
  }

  const fallback = templateFor(kind, variant);

  if ((kind === "samsvarserklaering" || kind === "sja") && variant) {
    return fallback;
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("document_templates")
      .select("definition")
      .eq("kind", kind)
      .maybeSingle();
    const def = data?.definition as { sections?: unknown[] } | undefined;
    if (def && Array.isArray(def.sections) && def.sections.length > 0) {
      return def as unknown as TemplateDef;
    }
  } catch {
    // ignore
  }
  return fallback;
}

function customTemplateToDef(row: {
  name: string;
  subtitle: string | null;
  description: string | null;
  definition: Record<string, unknown>;
}): TemplateDef {
  const def = row.definition as { sections?: SectionDef[] };
  return {
    kind: "custom",
    title: row.name,
    subtitle: row.subtitle ?? "",
    revision: "v1.0",
    description: row.description ?? undefined,
    sections: Array.isArray(def.sections) ? (def.sections as SectionDef[]) : [],
  };
}

// Hent alle aktive (ikke skjulte) custom-maler — for opprett-dropdown
export async function getCustomTemplates(): Promise<
  Array<{
    id: string;
    name: string;
    subtitle: string | null;
    description: string | null;
    is_hidden: boolean;
    ai_generated: boolean;
    updated_at: string;
  }>
> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("custom_templates")
      .select("id, name, subtitle, description, is_hidden, ai_generated, updated_at")
      .order("name");
    return data ?? [];
  } catch {
    return [];
  }
}
