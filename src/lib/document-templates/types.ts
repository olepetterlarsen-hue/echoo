// Skjema-definisjon for OPCOM-dokumenter (Risikovurdering, Sluttkontroll, Samsvarserklæring).
// Form og PDF rendres automatisk fra disse definisjonene.
// Strukturen matcher OneCo/OPCOM Elsikkerhetsdokumentasjon v3.4.

export type FieldKind =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "radio"          // ett valg fra liste, vises som radioknapper på linje
  | "yes_no"         // JA / NEI radio med farget badge (grønn/rød)
  | "checkbox"       // enkel ja/nei boks
  | "checkmark_group"// flere boxer kan krysses (type arbeid, type spenning)
  | "yna_group"      // Ja/Nei/Uakt + kommentar pr. item — OPCOMs standard sjekkpunkt-format
  | "yna_measurement_group" // som yna_group men med ekstra "verdi"-kolonne (måling/prøving)
  | "contact_subform"// Eier/Bruker/Annet + navn/telefon/epost
  | "scope_subform"  // Hele anlegget / Anleggsdel
  | "anvendte_normer_subform" // Nek 400 + Utg. + Annet beskrivelse
  | "people_list"    // Liste av personer: navn, rolle, signatur (SJA-deltakere)
  | "risk_table"     // Dynamisk tabell: operasjon/fare/konsekvens/sannsynlighet/tiltak/ansvarlig
  | "risk_assessment_group" // SJA-style: forhåndsdefinert risiko med Lav/Middels/Høy + besvarelse
  | "info";          // statisk ikke-redigerbar tekst

export interface YnaItem {
  key: string;
  label: string;
}

export interface RiskItem {
  key: string;
  label: string;
  description?: string;
}

export type RiskLevel = "lav" | "middels" | "hoey" | "ikke_aktuelt" | null;

export interface RiskAssessmentResponse {
  level: RiskLevel;
  besvarelse: string;
}

export interface RiskColumn {
  key: string;
  label: string;
  width?: "narrow" | "normal" | "wide";
}

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  hint?: string;
  options?: string[];          // for select / radio / checkmark_group
  items?: YnaItem[];           // for yna_group / yna_measurement_group
  riskItems?: RiskItem[];      // for risk_assessment_group
  measurementHeader?: string;  // header for verdi-kolonne, default "Verdi"
  columns?: RiskColumn[];      // for risk_table
  defaultValue?: unknown;
  prefilledFrom?:
    | "project.title"
    | "project.project_number"
    | "project.description"
    | "project.customer_name"
    | "project.customer_org_number"
    | "project.customer_contact"
    | "project.customer_email"
    | "project.customer_phone"
    | "project.customer_address"
    | "project.customer_postnr_sted"
    | "project.site_company"
    | "project.site_address"        // bare gateadressen
    | "project.site_address_full"   // gateadresse + nr + bokstav + postnr + sted (komplett)
    | "project.site_house_number"
    | "project.site_house_letter"
    | "project.site_postal_code"
    | "project.site_city"
    | "project.site_postnr_sted"
    | "project.site_ssb_number"
    | "project.installation_type";
  // For contact_subform: hvilken kilde fra prosjekt skal fylle navn/telefon/epost
  prefillContact?: "customer";
}

export interface SectionDef {
  title: string;
  description?: string;
  fields: FieldDef[];
}

export interface TemplateDef {
  kind:
    | "risikovurdering"
    | "sluttkontroll"
    | "samsvarserklaering"
    | "forenklet_sikkerhet"
    | "sja"
    | "ruh"
    | "startup_checklist"
    | "stikkprovekontroll"
    | "internkontroll"
    | "custom";
  title: string;
  subtitle: string;
  revision: string;
  description?: string;
  sections: SectionDef[];
}

// Datatyper for verdier lagret per field
export type YnaAnswer = "ja" | "nei" | "uakt" | null;

export interface YnaResponse {
  svar: YnaAnswer;
  kommentar: string;
}

export interface YnaMeasurementResponse extends YnaResponse {
  verdi: string;
}

export interface ContactSubformValue {
  rolle: "eier" | "bruker" | "annet" | null;
  navn: string;
  telefon: string;
  epost: string;
}

export interface ScopeSubformValue {
  type: "hele" | "del" | null;
  anleggsdel: string;
}

export interface AnvendteNormerValue {
  nek400: boolean;
  nek400_utg: string;
  annet: string;
}

export interface PersonItem {
  navn: string;
  rolle: string;
}

export type RiskRow = Record<string, string>;
