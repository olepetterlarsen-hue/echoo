import type { TemplateDef } from "./types";

// RUH — Rapport om Uønsket Hendelse.
// Brukes for å rapportere uønskede hendelser, nestenulykker og skader.

export const RUH: TemplateDef = {
  kind: "ruh",
  title: "RUH",
  subtitle: "Rapport om Uønsket Hendelse",
  revision: "v1.0",
  description:
    "Dette skjemaet skal brukes for å informere ledelsen om uønskede hendelser som har oppstått under arbeidet.",
  sections: [
    {
      title: "Beskriv hendelsen",
      fields: [
        {
          key: "incident_date",
          label: "Dato",
          kind: "date",
          required: true,
        },
        {
          key: "incident_description",
          label: "Hendelse — full beskrivelse",
          kind: "textarea",
          required: true,
          hint:
            "Beskriv hendelsen: hva skjedde, hvor, hvem var involvert, umiddelbare tiltak, skader, årsak og forebyggende tiltak.",
        },
        {
          key: "site_id",
          label: "Site ID",
          kind: "text",
        },
        {
          key: "emergency_measure",
          label: "Akuttiltak iverksatt",
          kind: "textarea",
          hint: "Hvilke umiddelbare tiltak ble gjort for å sikre området og personen(e)?",
        },
        {
          key: "solution_proposal",
          label: "Forslag til løsning for lignende tilfeller i fremtiden",
          kind: "textarea",
        },
      ],
    },
    {
      title: "Beskriv hva som gjøres for å hindre lignende hendelser",
      fields: [
        {
          key: "videre_tiltak",
          label: "Videre tiltak",
          kind: "textarea",
          required: true,
        },
      ],
    },
    {
      title: "Klassifisering",
      fields: [
        {
          key: "kategori",
          label: "Kategori",
          kind: "radio",
          options: [
            "Uønsket hendelse",
            "Nestenulykke",
            "Personskade",
            "Materiell skade",
            "Miljøskade",
            "Sikkerhetsobservasjon",
          ],
        },
        {
          key: "alvorlighet",
          label: "Alvorlighet",
          kind: "radio",
          options: ["Lav", "Middels", "Høy", "Kritisk"],
        },
      ],
    },
  ],
};
