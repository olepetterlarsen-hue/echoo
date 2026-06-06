import type { TemplateDef } from "./types";

// Internkontroll — gjennomgang av et signert dokument for å verifisere
// at det er komplett, korrekt og at eventuelle avvik følges opp.
// Startes fra knappen "Kjør internkontroll" på signerte dokumenter.

export const INTERNKONTROLL: TemplateDef = {
  kind: "internkontroll",
  title: "Internkontroll",
  subtitle: "Gjennomgang og verifikasjon av signert dokument",
  revision: "v1.0",
  description:
    "Brukes for å bekrefte at et signert dokument er komplett, korrekt utfylt, og at registrerte avvik er fulgt opp. Skal utføres av en annen person enn den som signerte originaldokumentet.",
  sections: [
    {
      title: "Referanse til kontrollert dokument",
      fields: [
        {
          key: "parent_kind",
          label: "Dokumenttype som kontrolleres",
          kind: "text",
          hint: "Fylles ut automatisk når du starter fra et dokument",
        },
        {
          key: "parent_reference",
          label: "Dokument-referanse (prosjekt + versjon)",
          kind: "text",
          hint: "Fylles ut automatisk",
        },
        {
          key: "kontroll_dato",
          label: "Kontrolldato",
          kind: "date",
          required: true,
        },
      ],
    },
    {
      title: "Komplettering og kvalitet",
      fields: [
        {
          key: "komplettering",
          label: "Sjekkpunkter",
          kind: "yna_group",
          items: [
            {
              key: "alle_felt",
              label: "Er alle påkrevde felter fylt ut?",
            },
            {
              key: "data_kvalitet",
              label: "Er dataene fornuftige og konsistente?",
            },
            {
              key: "malinger_innen_grense",
              label:
                "Er målinger og verdier innenfor forventet område (der relevant)?",
            },
            {
              key: "signatur_korrekt",
              label: "Er signaturen fra rett person/rolle?",
            },
            {
              key: "dato_korrekt",
              label: "Er datoer korrekte og logiske?",
            },
            {
              key: "kunde_info",
              label:
                "Stemmer kunde- og anleggsinformasjon med faktiske forhold?",
            },
          ],
        },
      ],
    },
    {
      title: "Avvikshåndtering",
      fields: [
        {
          key: "avvik",
          label: "Avvikssjekk",
          kind: "yna_group",
          items: [
            {
              key: "avvik_registrert",
              label: "Er alle observerte avvik registrert i systemet?",
            },
            {
              key: "avvik_lukket",
              label: "Er avvik lukket med beskrivelse av tiltak?",
            },
            {
              key: "kritiske_apne",
              label:
                "Er ingen kritiske avvik åpne uten plan for utbedring?",
            },
          ],
        },
      ],
    },
    {
      title: "Forskriftsmessig kontroll",
      fields: [
        {
          key: "forskrift",
          label: "Sjekkpunkter",
          kind: "yna_group",
          items: [
            {
              key: "fel_overholdt",
              label: "Er FEL Kap. V og § 12 overholdt (der relevant)?",
            },
            {
              key: "fse_overholdt",
              label: "Er FSE-rutiner fulgt under arbeidet?",
            },
            {
              key: "nek_400",
              label: "Er NEK 400 referert riktig i samsvarserklæring?",
            },
            {
              key: "dokumentasjon_overlevert",
              label:
                "Er kursfortegnelse / brukermanualer / dokumentasjon overlevert kunde?",
            },
          ],
        },
      ],
    },
    {
      title: "Konklusjon",
      fields: [
        {
          key: "konklusjon",
          label: "Resultat",
          kind: "radio",
          options: [
            "Godkjent — ingen merknader",
            "Godkjent med mindre merknader",
            "Krever korrigering før godkjenning",
            "Underkjent — alvorlige mangler",
          ],
          required: true,
        },
        {
          key: "merknader",
          label: "Merknader og krav til korrigering",
          kind: "textarea",
          hint: "Beskriv hva som må gjøres for at dokumentet kan godkjennes endelig",
        },
        {
          key: "tiltak_oppfolging",
          label: "Tiltak / oppfølgingsplan",
          kind: "textarea",
        },
        {
          key: "neste_kontroll_dato",
          label: "Neste planlagte kontroll (om aktuelt)",
          kind: "date",
        },
      ],
    },
  ],
};
