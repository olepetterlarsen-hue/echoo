import type { TemplateDef } from "../types";
import {
  SAMSVAR_INFO_SECTION,
  SAMSVAR_ANLEGG_KONTAKT_SECTION,
  SAMSVAR_ARBEIDSBESKRIVELSE_SECTION,
  SAMSVAR_ERKLAERING_SECTION,
} from "./shared";

// Samsvarserklæring — Næring / Industri
// For næringsbygg, kontorlokaler, lett industri, IT-rom (NEK 400 del 7).

export const SAMSVAR_NAERING: TemplateDef = {
  kind: "samsvarserklaering",
  title: "Samsvarserklæring — Næring / Industri",
  subtitle: "Samsvarserklæring for næringsbygg og industriinstallasjon",
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
            "Kontorbygg",
            "Butikk / forretning",
            "Lager / logistikk",
            "Verksted / lett industri",
            "Tung industri",
            "IT-rom / serverrom",
            "Helseinstallasjon",
            "Skole / undervisning",
            "Annet — se kommentar",
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
            "Hovedtavle / fordeling",
            "Underfordelinger",
            "Kursopplegg / belysning",
            "Reservestrøm / UPS",
            "Brannvarsling",
            "Adgangskontroll / nødlys",
            "Kabel / fremføring",
            "Annet — se arbeidsbeskrivelse",
          ],
        },
        {
          key: "type_spenning",
          label: "Type spenning",
          kind: "checkmark_group",
          options: ["400V AC", "230V AC", "690V AC", "48V DC", "Annet"],
        },
      ],
    },
    SAMSVAR_ARBEIDSBESKRIVELSE_SECTION,
    {
      title: "NEK 400 del 7 — Spesielle installasjoner",
      description: "Hak av hvilke spesielle installasjoner som omfattes (NEK 400 del 7).",
      fields: [
        {
          key: "nek400_del7",
          label: "NEK 400 del 7 — gjeldende",
          kind: "checkmark_group",
          options: [
            "701 — Bade-/dusjrom",
            "702 — Svømmebasseng",
            "703 — Sauna",
            "705 — Landbruk / dyrehold",
            "706 — Trange ledende rom",
            "708 — Campingplass",
            "710 — Medisinske områder",
            "713 — Møbler",
            "717 — Mobil/transportabel installasjon",
            "722 — Lading av elbil (se EV-mal)",
            "729 — Driftsganger",
            "Ingen av disse",
          ],
        },
      ],
    },
    {
      title: "Forutsetninger — sjekkpunkter",
      fields: [
        {
          key: "forutsetninger",
          label: "Sjekkpunkter",
          kind: "yna_group",
          items: [
            { key: "brann", label: "Brannvurdering utført og dokumentert?" },
            { key: "reserve", label: "Reservestrøm/UPS-behov vurdert?" },
            { key: "selektivitet", label: "Selektivitet mellom vern verifisert?" },
            { key: "ik_beregning", label: "Kortslutningsberegning utført (IK-verdier)?" },
            { key: "jording_industri", label: "Jordingsanlegg dimensjonert for anleggstype?" },
            { key: "merking_komplett", label: "Komplett merking av kurser og utstyr?" },
            { key: "termografi", label: "Termografi planlagt etter idriftsettelse?" },
          ],
        },
      ],
    },
    SAMSVAR_ERKLAERING_SECTION,
  ],
};
