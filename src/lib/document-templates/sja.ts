import type { TemplateDef } from "./types";

// SJA — Standard variant for bolig, næring og EV-lade.
// Forenklet til vanlig elektroarbeid. Telekom-spesifikke punkter
// (mast, kabling, helikopter) ligger i sja-telekom.ts og brukes
// automatisk når project.installation_type = 'telecom'.

export const SJA: TemplateDef = {
  kind: "sja",
  title: "SJA",
  subtitle: "Sikker Jobb Analyse",
  revision: "v1.0",
  description:
    "Gjennomgås før arbeid startes. Identifiser risiko, dokumenter tiltak og bekreft at deltakerne har forstått.",
  sections: [
    {
      title: "Info",
      fields: [
        {
          key: "ordre_referanse",
          label: "Ordrereferanse",
          kind: "text",
          prefilledFrom: "project.project_number",
        },
        {
          key: "dato_gjennomfort",
          label: "SJA gjennomført dato",
          kind: "date",
          required: true,
        },
        {
          key: "sted_gjennomfort",
          label: "Sted hvor SJA er gjennomført",
          kind: "text",
          hint: "Anlegg, brakke, kontor osv.",
        },
      ],
    },
    {
      title: "Arbeidsbeskrivelse",
      fields: [
        {
          key: "arbeidsoppgave",
          label: "Hva skal gjøres?",
          kind: "textarea",
          required: true,
          hint: "Beskriv arbeidet, omfang og verktøy/utstyr som skal brukes",
        },
        {
          key: "arbeidssted",
          label: "Arbeidssted / anleggsdel",
          kind: "text",
          prefilledFrom: "project.site_address_full",
        },
      ],
    },
    {
      title: "Deltakere",
      fields: [
        {
          key: "deltakere",
          label: "Personer som deltar i arbeidet",
          kind: "people_list",
        },
        {
          key: "leder",
          label: "Ansvarlig leder",
          kind: "text",
          required: true,
        },
      ],
    },
    {
      title: "Risikovurdering",
      description:
        "Sett risikonivå og beskriv tiltak for hver fare som er relevant.",
      fields: [
        {
          key: "risikoer",
          label: "Vurder farer",
          kind: "risk_assessment_group",
          riskItems: [
            {
              key: "elektrisk_stot",
              label: "Elektrisk støt / berøring av spenningssatte deler",
              description: "Vurder behov for frakobling og spenningsmåling.",
            },
            {
              key: "lysbue",
              label: "Lysbue / kortslutning",
              description: "Aktuelt ved arbeid på fordelinger og tavler.",
            },
            { key: "fall_hoyde", label: "Fall fra høyde (stige, stillas, tak)" },
            { key: "fallende_objekter", label: "Fallende objekter / verktøy" },
            { key: "tunge_loeft", label: "Tunge løft / klemskader" },
            { key: "stoy", label: "Støy fra verktøy" },
            { key: "stov", label: "Støv / asbest / kjemikalier" },
            { key: "varmt_arbeid", label: "Varmt arbeid (sveising, vinkelsliper)" },
            { key: "trange_rom", label: "Trange / ledende rom" },
            {
              key: "trafikk",
              label: "Trafikk / arbeid i vei",
              description: "Skilting og varsling iht. arbeidsvarslingsplan.",
            },
          ],
        },
      ],
    },
    {
      title: "Personlig verneutstyr",
      fields: [
        {
          key: "verneutstyr",
          label: "Påkrevd verneutstyr",
          kind: "checkmark_group",
          options: [
            "Hjelm",
            "Vernebriller",
            "Hørselvern",
            "Isolerte hansker",
            "Vernesko",
            "Lysbuesikre arbeidsklær",
            "Fallsikring",
            "Pustevern / støvmaske",
            "Refleksvest",
          ],
        },
        {
          key: "annet_verneutstyr",
          label: "Annet verneutstyr",
          kind: "text",
        },
      ],
    },
    {
      title: "Beredskap",
      fields: [
        {
          key: "beredskap",
          label: "Beredskap",
          kind: "yna_group",
          items: [
            { key: "rommeligheter", label: "Rømningsveier kjent?" },
            { key: "forstehjelp", label: "Førstehjelpsutstyr tilgjengelig?" },
            { key: "brannslukker", label: "Brannslukker tilgjengelig (særlig ved varmt arbeid)?" },
            { key: "kommunikasjon", label: "Telefon / samband fungerer på stedet?" },
          ],
        },
        {
          key: "noedkontakt",
          label: "Nødkontakt — navn og telefon",
          kind: "text",
        },
      ],
    },
    {
      title: "Konklusjon",
      fields: [
        {
          key: "samlet_risiko",
          label: "Samlet vurdering",
          kind: "radio",
          options: [
            "Akseptabel — arbeid kan gjennomføres",
            "Akseptabel etter tiltak",
            "Uakseptabel — arbeid skal ikke utføres som planlagt",
          ],
          required: true,
        },
        {
          key: "godkjent",
          label: "SJA godkjent for arbeid",
          kind: "checkbox",
          required: true,
        },
        {
          key: "kommentar",
          label: "Tilleggsmerknader",
          kind: "textarea",
        },
      ],
    },
  ],
};
