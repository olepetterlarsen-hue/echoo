// Token-substitusjon for dokumentmaler.
//
// Når admin bygger en mal kan de inkludere tokens som $kunde_navn,
// $prosjektnummer, $firma_navn osv. i defaultValue-strenger. Tokens blir
// erstattet med faktiske verdier fra Project + selskaps-innstillinger
// (org) når dokumentet seedes.
//
// Eksempel:
//   defaultValue: "Utført av $firma_navn for $kunde_navn"
//   →            "Utført av Ola Elektro AS for Bygg & Bo AS"

import type { AppSettings, Project } from "@/lib/types/database";

// Firmalogo behandles som spesial-token. Ren tekst-substitusjon gir ingen
// mening (logoen er et bilde), så vi beholder token-strengen som placeholder
// i formen. PDF-renderer og eventuell inline-visning må håndtere den separat.
export const LOGO_TOKEN = "$firma_logo";

export interface TokenDef {
  key: string;
  label: string;
  description?: string;
  // Hvor kommer verdien fra:
  //   "project"  → pickFromProject(project, sourceKey)
  //   "settings" → sett-lookup fra AppSettings[sourceKey]
  //   "special"  → egen substitusjonslogikk (bare $firma_logo i dag)
  source: "project" | "settings" | "special";
  sourceKey: string;
  group: "prosjekt" | "kunde" | "anlegg" | "firma" | "installator";
}

// Master-liste over tokens. TOKENS beholdes stabil så eksisterende maler
// aldri blir "ugyldige" — nye tokens skal alltid legges til på slutten.
export const TOKENS: TokenDef[] = [
  // Prosjekt
  { key: "$prosjektnummer", label: "Prosjektnummer", source: "project", sourceKey: "project.project_number", group: "prosjekt" },
  { key: "$prosjekt_tittel", label: "Prosjekt-tittel", source: "project", sourceKey: "project.title", group: "prosjekt" },
  { key: "$prosjekt_beskrivelse", label: "Prosjekt-beskrivelse", source: "project", sourceKey: "project.description", group: "prosjekt" },
  { key: "$installasjonstype", label: "Installasjonstype", source: "project", sourceKey: "project.installation_type", group: "prosjekt" },

  // Kunde
  { key: "$kunde_navn", label: "Kundenavn", source: "project", sourceKey: "project.customer_name", group: "kunde" },
  { key: "$kunde_orgnr", label: "Kundens orgnr", source: "project", sourceKey: "project.customer_org_number", group: "kunde" },
  { key: "$kunde_kontakt", label: "Kontaktperson", source: "project", sourceKey: "project.customer_contact", group: "kunde" },
  { key: "$kunde_epost", label: "Kundens e-post", source: "project", sourceKey: "project.customer_email", group: "kunde" },
  { key: "$kunde_telefon", label: "Kundens telefon", source: "project", sourceKey: "project.customer_phone", group: "kunde" },
  { key: "$kunde_adresse", label: "Kundens adresse", source: "project", sourceKey: "project.customer_address", group: "kunde" },
  { key: "$kunde_postnr_sted", label: "Kunde postnr+sted", source: "project", sourceKey: "project.customer_postnr_sted", group: "kunde" },

  // Anlegg
  { key: "$anlegg_firma", label: "Anleggets firma", source: "project", sourceKey: "project.site_company", group: "anlegg" },
  { key: "$anlegg_adresse", label: "Anleggets adresse", source: "project", sourceKey: "project.site_address_full", group: "anlegg" },
  { key: "$anlegg_postnr_sted", label: "Anlegg postnr+sted", source: "project", sourceKey: "project.site_postnr_sted", group: "anlegg" },
  { key: "$anlegg_ssb", label: "Anleggets SSB-nr", source: "project", sourceKey: "project.site_ssb_number", group: "anlegg" },

  // Firma (fra organisasjonens innstillinger — /admin/bedrift)
  { key: "$firma_navn", label: "Bedriftsnavn", source: "settings", sourceKey: "firma", group: "firma" },
  { key: "$firma_orgnr", label: "Bedriftens orgnr", source: "settings", sourceKey: "org_nr", group: "firma" },
  { key: "$firma_adresse", label: "Bedriftens adresse", source: "settings", sourceKey: "selskap_adresse", group: "firma" },
  { key: "$firma_postnr_sted", label: "Bedrift postnr+sted", source: "settings", sourceKey: "selskap_postnr_sted", group: "firma" },
  { key: "$firma_telefon", label: "Bedriftens telefon", source: "settings", sourceKey: "selskap_telefon", group: "firma" },
  { key: "$firma_epost", label: "Bedriftens e-post", source: "settings", sourceKey: "selskap_epost", group: "firma" },
  {
    key: LOGO_TOKEN,
    label: "Firmalogo",
    description: "Placeholder for logoen — settes inn som bilde i PDF-renderingen.",
    source: "special",
    sourceKey: "logo",
    group: "firma",
  },

  // Installatør (fra /admin/bedrift)
  { key: "$installator_navn", label: "Installatørens navn", source: "settings", sourceKey: "installator_navn", group: "installator" },
  { key: "$installator_tittel", label: "Installatørens tittel", source: "settings", sourceKey: "installator_tittel", group: "installator" },
  { key: "$installator_telefon", label: "Installatørens telefon", source: "settings", sourceKey: "installator_telefon", group: "installator" },
  { key: "$installator_epost", label: "Installatørens e-post", source: "settings", sourceKey: "installator_epost", group: "installator" },
];

export const TOKEN_BY_KEY: Record<string, TokenDef> =
  Object.fromEntries(TOKENS.map((t) => [t.key, t]));

// Regex som matcher en token-key. $-tegn etterfulgt av lowercase letters
// + underscores. Stopper ved bokstav-grense så "$kunde_navn." kun matcher
// "$kunde_navn".
const TOKEN_RE = /\$[a-zøæå_]+/gi;

function pickFromProject(p: Project, sourceKey: string): string | null {
  const compact = (parts: (string | null | undefined)[]): string | null =>
    parts.filter(Boolean).join(" ").trim() || null;

  switch (sourceKey) {
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

function pickFromSettings(
  s: AppSettings | null,
  sourceKey: string,
): string | null {
  if (!s) return null;
  const compact = (parts: (string | null | undefined)[]): string | null =>
    parts.filter(Boolean).join(" ").trim() || null;

  switch (sourceKey) {
    case "firma":
      return s.firma || null;
    case "org_nr":
      return s.org_nr || null;
    case "selskap_adresse":
      return s.selskap_adresse || null;
    case "selskap_postnr":
      return s.selskap_postnr || null;
    case "selskap_sted":
      return s.selskap_sted || null;
    case "selskap_postnr_sted":
      return compact([s.selskap_postnr, s.selskap_sted]);
    case "selskap_telefon":
      return s.selskap_telefon || null;
    case "selskap_epost":
      return s.selskap_epost || null;
    case "installator_navn":
      return s.installator_navn || null;
    case "installator_tittel":
      return s.installator_tittel || null;
    case "installator_telefon":
      return s.installator_telefon || null;
    case "installator_epost":
      return s.installator_epost || null;
    default:
      return null;
  }
}

/**
 * Erstatter alle $-tokens i en streng med verdier fra Project + Settings.
 * Ukjente eller manglende tokens beholdes som råtekst slik at brukeren
 * ser hva som mangler i stedet for at strengen blir uventet kortet ned.
 *
 * $firma_logo er spesial: den beholdes som placeholder i teksten fordi
 * logo skal håndteres som bilde separat (PDF-renderer erstatter den der).
 */
export function applyTokens(
  text: string,
  project: Project | null,
  settings: AppSettings | null = null,
): string {
  if (!project && !settings) return text;
  if (!text.includes("$")) return text;
  return text.replace(TOKEN_RE, (match) => {
    const def = TOKEN_BY_KEY[match.toLowerCase()];
    if (!def) return match;
    if (def.source === "project") {
      if (!project) return match;
      const value = pickFromProject(project, def.sourceKey);
      return value ?? match;
    }
    if (def.source === "settings") {
      const value = pickFromSettings(settings, def.sourceKey);
      return value ?? match;
    }
    if (def.source === "special" && def.key === LOGO_TOKEN) {
      // Behold placeholder i strengen — form/PDF håndterer bildet separat.
      return match;
    }
    return match;
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

/**
 * Sample-selskaps-innstillinger for builder-preview.
 */
export function samplePreviewSettings(): AppSettings {
  return {
    id: "company",
    firma: "Ola Elektro AS",
    org_nr: "913 456 789",
    selskap_adresse: "Elveveien 5",
    selskap_postnr: "0350",
    selskap_sted: "Oslo",
    selskap_telefon: "+47 22 33 44 55",
    selskap_epost: "post@ola-elektro.no",
    installator_navn: "Ola Nordmann",
    installator_tittel: "Faglig ansvarlig installatør",
    installator_telefon: "+47 900 12 345",
    installator_epost: "ola@ola-elektro.no",
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
}
