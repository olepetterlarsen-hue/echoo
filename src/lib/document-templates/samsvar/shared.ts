import type { SectionDef } from "../types";

// Felles seksjoner som brukes på tvers av alle Samsvarsmaler.
// Gjør at endringer i kjernen kun trenger å gjøres ett sted.

export const SAMSVAR_INFO_SECTION: SectionDef = {
  title: "Info",
  fields: [
    { key: "site_id", label: "Site ID", kind: "text" },
    {
      key: "ordre_referanse",
      label: "Ordrereferanse",
      kind: "text",
      prefilledFrom: "project.project_number",
    },
  ],
};

export const SAMSVAR_ANLEGG_KONTAKT_SECTION: SectionDef = {
  title: "Anlegg – Kontaktperson",
  fields: [
    {
      key: "anlegg_kontakt",
      label: "Kontaktperson på anlegget",
      kind: "contact_subform",
      prefillContact: "customer",
    },
  ],
};

export const SAMSVAR_ARBEIDSBESKRIVELSE_SECTION: SectionDef = {
  title: "Arbeidsbeskrivelse",
  fields: [
    {
      key: "arbeidsbeskrivelse",
      label: "Beskrivelse av utført arbeid",
      kind: "textarea",
      required: true,
    },
  ],
};

// Erklæringen står som standardtekst — ingen separate signaturfelter.
// Signering skjer via systemets digitale signatur (Installatør / Bemyndiget).
export const SAMSVAR_ERKLAERING_SECTION: SectionDef = {
  title: "Erklæring",
  fields: [
    {
      key: "erklaering",
      label: "",
      kind: "info",
      defaultValue:
        "Undertegnede erklærer at anlegget er planlagt og kontrollert slik at det oppfyller sikkerhetskravene i forskrift om elektriske lavspenningsanlegg Kapittel V. Dokumentasjon i henhold til § 12 er overlevert eier av anlegget.",
    },
  ],
};
