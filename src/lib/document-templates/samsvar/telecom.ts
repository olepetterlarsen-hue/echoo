import type { TemplateDef } from "../types";
import {
  SAMSVAR_INFO_SECTION,
  SAMSVAR_ANLEGG_KONTAKT_SECTION,
  SAMSVAR_ARBEIDSBESKRIVELSE_SECTION,
  SAMSVAR_ERKLAERING_SECTION,
} from "./shared";

// Samsvarserklæring — Telecom / Mast
// For telecom-infrastruktur: master, basestasjoner, kabelfremføring telekom.
// NEK 399 (tilknytningspunkt) + Telenors retningslinjer.

export const SAMSVAR_TELECOM: TemplateDef = {
  kind: "samsvarserklaering",
  title: "Samsvarserklæring — Telecom / Mast",
  subtitle: "Samsvarserklæring for telecom-installasjon",
  revision: "v1.0",
  sections: [
    SAMSVAR_INFO_SECTION,
    SAMSVAR_ANLEGG_KONTAKT_SECTION,
    {
      title: "Anleggsbeskrivelse",
      fields: [
        {
          key: "type_endring",
          label: "Type endring",
          kind: "radio",
          options: ["Nyanlegg", "Utvidelse", "Endring"],
          required: true,
        },
        {
          key: "type_anlegg",
          label: "Type anlegg",
          kind: "select",
          options: [
            "Mast / Tårn — telekom",
            "Basestasjon — innendørs",
            "Basestasjon — utendørs",
            "Datasenter / utstyrshytte",
            "Tilknytningspunkt (NEK 399)",
            "Kabelfremføring telekom",
            "Annet — se kommentar",
          ],
        },
        { key: "site_klassifisering", label: "Site-klassifisering", kind: "text", hint: "f.eks. type A/B/C, kraftkategori" },
        {
          key: "anvendte_normer",
          label: "Anvendte normer",
          kind: "anvendte_normer_subform",
        },
        {
          key: "telenor_retningslinjer",
          label: "Telenor-retningslinjer benyttet",
          kind: "checkmark_group",
          options: [
            "Prosjektering montasje idriftsettelse av elektro",
            "TSSR — sikringstiltak",
            "Mast-spesifikasjoner",
            "Kraftforsyning til site",
            "Jordingssystem mast",
          ],
        },
        {
          key: "type_arbeid",
          label: "Type arbeid",
          kind: "checkmark_group",
          options: [
            "Nyanlegg",
            "Mastearbeid",
            "Kraftforsyning / fordeling",
            "Batterirom / DC-anlegg",
            "Kabelfremføring",
            "Jordingsanlegg",
            "Lynvernanlegg",
            "Annet — skriv i kommentarfeltet",
          ],
        },
        {
          key: "type_spenning",
          label: "Type spenning",
          kind: "checkmark_group",
          options: ["400V AC", "230V AC", "48V DC", "-48V DC", "Annet"],
        },
      ],
    },
    SAMSVAR_ARBEIDSBESKRIVELSE_SECTION,
    {
      title: "Forutsetninger — telecom-spesifikt",
      fields: [
        {
          key: "forutsetninger_telecom",
          label: "Sjekkpunkter",
          kind: "yna_group",
          items: [
            { key: "nek399", label: "Tilknytningspunkt iht. NEK 399?" },
            { key: "jording_mast", label: "Jordingssystem for mast etablert/verifisert?" },
            { key: "lynvern", label: "Lynvern (overspenningsvern) dimensjonert?" },
            { key: "emc", label: "EMC-vurdering utført?" },
            { key: "induksjon", label: "Risiko for induserte spenninger vurdert?" },
            { key: "batteri", label: "Batteri-/DC-system kontrollert (om aktuelt)?" },
            { key: "kabelinnforing", label: "Kabelinnføringer mast riktig utført?" },
            { key: "merking_site", label: "Site og kurser tilstrekkelig merket?" },
          ],
        },
      ],
    },
    SAMSVAR_ERKLAERING_SECTION,
  ],
};
