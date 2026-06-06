import type { TemplateDef } from "../types";
import {
  SAMSVAR_INFO_SECTION,
  SAMSVAR_ANLEGG_KONTAKT_SECTION,
  SAMSVAR_ARBEIDSBESKRIVELSE_SECTION,
  SAMSVAR_ERKLAERING_SECTION,
} from "./shared";

// Samsvarserklæring — Bolig
// Standard for enebolig, leilighet, fritidsbolig.
// De 5 Sikre er en arbeidsprosedyre — håndteres på Risikovurdering,
// ikke på Samsvarserklæring.

export const SAMSVAR_BOLIG: TemplateDef = {
  kind: "samsvarserklaering",
  title: "Samsvarserklæring — Bolig",
  subtitle: "Samsvarserklæring med garanti (boliginstallasjon)",
  revision: "v3.4 · 17.10.2022",
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
            "Enebolig",
            "Tomannsbolig",
            "Leilighet",
            "Fritidsbolig",
            "Garasje/uthus",
          ],
        },
        { key: "malernummer", label: "Målernummer", kind: "text" },
        {
          key: "anvendte_normer",
          label: "Anvendte normer",
          kind: "anvendte_normer_subform",
        },
        {
          key: "type_arbeid",
          label: "Type arbeid",
          kind: "checkmark_group",
          options: [
            "Nyanlegg",
            "Nytt vern",
            "Utskifting av vern",
            "Kabel",
            "Stikkontakter / brytere",
            "Belysning",
            "Varmesystem",
            "Annet — se arbeidsbeskrivelse",
          ],
        },
        {
          key: "type_spenning",
          label: "Type spenning",
          kind: "checkmark_group",
          options: ["400V AC", "230V AC", "48V DC"],
        },
      ],
    },
    SAMSVAR_ARBEIDSBESKRIVELSE_SECTION,
    SAMSVAR_ERKLAERING_SECTION,
  ],
};
