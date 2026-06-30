// Token-substitusjon for dokumentmaler.
//
// Når admin bygger en mal kan de inkludere tokens som $kunde_navn,
// $prosjektnummer osv. i defaultValue-strenger. Tokens blir erstattet
// med faktiske verdier fra Project når dokumentet seedes.
//
// Eksempel:
//   defaultValue: "Bestilling fra $kunde_navn på prosjekt $prosjektnummer"
//   →            "Bestilling fra Bygg & Bo AS på prosjekt 2026-0042"

import type { Project } from "@/lib/types/database";

export interface TokenDef {
  key: string;          // f.eks. "$kunde_navn"
  label: string;        // f.eks. "Kundenavn"
  description?: string; // tooltip-tekst
  prefilledFrom: string; // matcher prefilledFrom-verdi i FieldDef
  group: "prosjekt" | "kunde" | "anlegg";
}

// Master-liste over tokens. Hver token mapper til en prefilledFrom-verdi
// som allerede er kjent av pickProjectValue() i document-editor.tsx.
export const TOKENS: TokenDef[] = [
  // Prosjekt
  { key: "$prosjektnummer", label: "Prosjektnummer", prefilledFrom: "project.project_number", group: "prosjekt" },
  { key: "$prosjekt_tittel", label: "Prosjekt-tittel", prefilledFrom: "project.title", group: "prosjekt" },
  { key: "$prosjekt_beskrivelse", label: "Prosjekt-beskrivelse", prefilledFrom: "project.description", group: "prosjekt" },
  { key: "$installasjonstype", label: "Installasjonstype", prefilledFrom: "project.installation_type", group: "prosjekt" },

  // Kunde
  { key: "$kunde_navn", label: "Kundenavn", prefilledFrom: "project.customer_name", group: "kunde" },
  { key: "$kunde_orgnr", label: "Kundens orgnr", prefilledFrom: "project.customer_org_number", group: "kunde" },
  { key: "$kunde_kontakt", label: "Kontaktperson", prefilledFrom: "project.customer_contact", group: "kunde" },
  { key: "$kunde_epost", label: "Kundens e-post", prefilledFrom: "project.customer_email", group: "kunde" },
  { key: "$kunde_telefon", label: "Kundens telefon", prefilledFrom: "project.customer_phone", group: "kunde" },
  { key: "$kunde_adresse", label: "Kundens adresse", prefilledFrom: "project.customer_address", group: "kunde" },
  { key: "$kunde_postnr_sted", label: "Kunde postnr+sted", prefilledFrom: "project.customer_postnr_sted", group: "kunde" },

  // Anlegg
  { key: "$anlegg_firma", label: "Anleggets firma", prefilledFrom: "project.site_company", group: "anlegg" },
  { key: "$anlegg_adresse", label: "Anleggets adresse", prefilledFrom: "project.site_address_full", group: "anlegg" },
  { key: "$anlegg_postnr_sted", label: "Anlegg postnr+sted", prefilledFrom: "project.site_postnr_sted", group: "anlegg" },
  { key: "$anlegg_ssb", label: "Anleggets SSB-nr", prefilledFrom: "project.site_ssb_number", group: "anlegg" },
];

export const TOKEN_BY_KEY: Record<string, TokenDef> =
  Object.fromEntries(TOKENS.map((t) => [t.key, t]));

// Regex som matcher en token-key. Lar oss både splitte og erstatte.
// $-tegn etterfulgt av lowercase letters + underscores. Stopper ved
// bokstav-grense så "$kunde_navn." matcher kun "$kunde_navn".
const TOKEN_RE = /\$[a-zøæå_]+/gi;

/**
 * Plukker verdi fra Project som matcher en token sin prefilledFrom.
 * Re-implementerer pickProjectValue() fra document-editor.tsx slik at
 * token-systemet kan brukes uavhengig av React-renderingen (bl.a. for
 * live preview og enhetstester).
 */
function pickFromProject(p: Project, prefilledFrom: string): string | null {
  const compact = (parts: (string | null | undefined)[]): string | null =>
    parts.filter(Boolean).join(" ").trim() || null;

  switch (prefilledFrom) {
    case "project.title":
      return p.title ?? null;
    case "project.project_number":
      return p.project_number ?? null;
    case "project.description":
      return p.description ?? null;
    case "project.customer_name":
      return p.customer_name ?? null;
    case "project.customer_org_number":
      return p.customer_org_number ?? null;
    case "project.customer_contact":
      return p.customer_contact ?? null;
    case "project.customer_email":
      return p.customer_email ?? null;
    case "project.customer_phone":
      return p.customer_phone ?? null;
    case "project.customer_address":
      return p.customer_address ?? null;
    case "project.customer_postnr_sted":
      return compact([p.customer_postal_code, p.customer_city]);
    case "project.site_company":
      return p.site_company ?? null;
    case "project.site_address":
      return p.site_address ?? null;
    case "project.site_address_full":
      return compact([
        p.site_address,
        p.site_house_number,
        p.site_house_letter,
        compact([p.site_postal_code, p.site_city]),
      ]);
    case "project.site_house_number":
      return p.site_house_number ?? null;
    case "project.site_house_letter":
      return p.site_house_letter ?? null;
    case "project.site_postal_code":
      return p.site_postal_code ?? null;
    case "project.site_city":
      return p.site_city ?? null;
    case "project.site_postnr_sted":
      return compact([p.site_postal_code, p.site_city]);
    case "project.site_ssb_number":
      return p.site_ssb_number ?? null;
    case "project.installation_type":
      return p.installation_type ?? null;
    default:
      return null;
  }
}

/**
 * Erstatter alle $-tokens i en streng med verdier fra et Project.
 * Ukjente eller manglende tokens beholdes som råtekst slik at brukeren
 * ser hva som mangler i stedet for at strengen blir uventet kortet ned.
 */
export function applyTokens(text: string, project: Project | null): string {
  if (!project) return text;
  if (!text.includes("$")) return text;
  return text.replace(TOKEN_RE, (match) => {
    const def = TOKEN_BY_KEY[match.toLowerCase()];
    if (!def) return match;
    const value = pickFromProject(project, def.prefilledFrom);
    return value ?? match;
  });
}

/**
 * Identifiserer om en streng inneholder minst ett gyldig token.
 * Brukes til å trigge live-preview kun når relevant.
 */
export function hasTokens(text: string): boolean {
  if (!text.includes("$")) return false;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (TOKEN_BY_KEY[m[0].toLowerCase()]) return true;
  }
  return false;
}

/**
 * Sample-data for builder-preview når det ikke finnes et reelt Project.
 * Brukes i mal-byggeren slik at admin ser hvordan tokens blir erstattet.
 */
export function samplePreviewProject(): Project {
  return {
    id: "preview",
    title: "Demo-prosjekt",
    project_number: "2026-0042",
    description: "Eksempel-prosjekt for malforhåndsvisning",
    customer_name: "Bygg & Bo AS",
    customer_org_number: "923 456 789",
    customer_contact: "Kari Nordmann",
    customer_email: "kari@bygg-bo.no",
    customer_phone: "+47 412 34 567",
    customer_address: "Storgata 12",
    customer_postal_code: "0184",
    customer_city: "Oslo",
    site_company: "Bygg & Bo AS",
    site_address: "Industrivegen",
    site_house_number: "7",
    site_house_letter: "B",
    site_postal_code: "0184",
    site_city: "Oslo",
    site_ssb_number: "0301",
    installation_type: "bolig",
  } as unknown as Project;
}
