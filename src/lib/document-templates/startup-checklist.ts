import type { TemplateDef } from "./types";

// Oppstartssjekkliste — fylles ut ved begynnelsen av hvert skift/rotasjon.
// Verifiserer at utstyr og sikkerhetsutstyr er på plass før arbeid starter.

export const STARTUP_CHECKLIST: TemplateDef = {
  kind: "startup_checklist",
  title: "Oppstartssjekkliste",
  subtitle: "Sjekkliste ved start av hvert skift/rotasjon",
  revision: "v1.0",
  description:
    "Denne listen må gjennomgås og sendes inn før hver nye rotasjon starter.",
  sections: [
    {
      title: "Utstyr",
      fields: [
        {
          key: "car_registration",
          label: "Bilens registreringsnummer",
          kind: "text",
          required: true,
        },
        {
          key: "checklist",
          label: "Utstyrssjekk",
          kind: "yna_group",
          items: [
            {
              key: "fire_extinguisher",
              label:
                "Brannslukker x 2, 6 kg — det skal alltid være 2 i bilen. Skal uten unntak være med på anlegget når varmt arbeid utføres.",
            },
            {
              key: "rescue_kit",
              label: "Redningsutstyr — må være med ved klatring.",
            },
            {
              key: "helmets",
              label: "Hjelmer — SKAL brukes ved arbeid på anlegget.",
            },
            {
              key: "safety_goggles",
              label: "Vernebriller — må brukes ved arbeid med elverktøy.",
            },
            { key: "gloves", label: "Hansker" },
            { key: "ear_protection", label: "Hørselvern" },
            {
              key: "first_aid",
              label: "Førstehjelpsutstyr — må være lett tilgjengelig på hver jobb.",
            },
            {
              key: "double_safetyline",
              label:
                "Dobbel sikringsline — skal uten unntak alltid brukes ved klatring.",
            },
            {
              key: "hms_card",
              label: "HMS-kort eller gyldig QR-kode for alle teammedlemmer.",
            },
          ],
        },
      ],
    },
    {
      title: "Klatresele — inspeksjon",
      description:
        "Sjekk datoen klatreselen sist ble inspisert. Fyll inn dato for neste årlige inspeksjon. Varsle ledelsen når det er 2 måneder igjen til neste inspeksjon.",
      fields: [
        {
          key: "harness_team_leader",
          label: "Inspeksjonsdato — klatresele — Team-leder",
          kind: "date",
        },
        {
          key: "harness_team_member",
          label: "Inspeksjonsdato — klatresele — Teammedlem",
          kind: "date",
        },
      ],
    },
    {
      title: "Team",
      fields: [
        {
          key: "team_members",
          label: "Teammedlemmer på dette skiftet",
          kind: "people_list",
        },
      ],
    },
    {
      title: "Kommentarer",
      fields: [
        {
          key: "comments",
          label: "Kommentarer / observasjoner",
          kind: "textarea",
        },
      ],
    },
  ],
};
