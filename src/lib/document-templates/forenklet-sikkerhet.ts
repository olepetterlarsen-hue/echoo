import type { TemplateDef } from "./types";

// OPCOM Risikovurdering, Sluttkontroll og Samsvarserklæring v3.4 (rev 19.10.2022)
// Dokumentasjon av serviceoppdrag med lav risiko.
//
// VIKTIG: Denne dokumentasjonen skal kun benyttes til enkle installasjonsoppdrag
// med lav risiko. Dersom det kan svares JA på ALLE sjekkpunkt i gruppen
// «Risikovurdering (Forutsetninger – lav risiko)» er arbeidet å anse som
// «mindre oppdrag med lav risiko» og sjekklisten kan benyttes. Dersom ikke,
// må komplett 5 Sikre dokumentasjon eller tilsvarende benyttes.
// Forenklet dokumentasjon kan IKKE benyttes for installasjoner som omfattes
// av NEK 400 del 7 og arbeid på utstyr som batteri, likeretter, UPS,
// diesel-/bensinaggregat.

export const FORENKLET_SIKKERHET: TemplateDef = {
  kind: "forenklet_sikkerhet",
  title: "Risikovurdering, Sluttkontroll og Samsvarserklæring",
  subtitle: "Dokumentasjon av serviceoppdrag med lav risiko",
  revision: "v3.4 · 19.10.2022",
  sections: [
    {
      title: "Viktig",
      fields: [
        {
          key: "viktig_notis",
          label: "",
          kind: "info",
          defaultValue:
            "Denne dokumentasjonen skal kun benyttes til enkle installasjonsoppdrag med lav risiko. Dersom det kan svares JA på ALLE sjekkpunkt i gruppen «Risikovurdering (Forutsetninger – lav risiko)» er arbeidet å anse som «mindre oppdrag med lav risiko» og sjekklisten kan benyttes. Dersom ikke, må komplett 5 Sikre dokumentasjon eller tilsvarende benyttes. Det er en forutsetning at utførende kommuniserer med eier/bruker. Forenklet dokumentasjon kan ikke benyttes for installasjoner som omfattes av NEK 400 del 7 og arbeid på utstyr som batteri, likeretter, UPS, diesel-/bensinaggregat.",
        },
      ],
    },
    {
      title: "Info",
      fields: [
        { key: "site_id", label: "Site ID", kind: "text" },
        { key: "ordre_referanse", label: "Ordrereferanse", kind: "text" },
      ],
    },
    {
      title: "Anlegg – Kontaktperson",
      fields: [
        {
          key: "anlegg_kontakt",
          label: "Kontaktperson på anlegget",
          kind: "contact_subform",
          prefillContact: "customer",
        },
      ],
    },
    {
      title: "Anleggsbeskrivelse",
      fields: [
        {
          key: "type_endring",
          label: "Type endring",
          kind: "radio",
          options: ["Utvidelse", "Endring"],
          required: true,
          hint: "For nyanlegg må komplett 5 Sikre-dokumentasjon benyttes",
        },
        { key: "type_anlegg", label: "Type anlegg", kind: "text" },
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
            "Tilkobling/utskifting av utstyr",
            "Kabel",
            "Annet – skriv i kommentarfeltet",
          ],
        },
        {
          key: "type_spenning",
          label: "Type spenning",
          kind: "checkmark_group",
          options: ["400V AC", "230V AC", "48V DC"],
        },
        {
          key: "kommentar_anleggsnumre",
          label: "Kommentar / Anleggsnumre",
          kind: "textarea",
        },
      ],
    },
    {
      title: "Arbeidsbeskrivelse",
      fields: [
        {
          key: "arbeidsbeskrivelse",
          label: "Beskrivelse av utført arbeid",
          kind: "textarea",
          required: true,
        },
      ],
    },
    {
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
    },
    {
      title: "Rapportens omfang",
      fields: [
        {
          key: "omfang",
          label: "Omfang",
          kind: "scope_subform",
          hint: "Forenklet dokumentasjon brukes typisk for anleggsdel",
        },
      ],
    },
    {
      title: "Sjekkpunkt — Risikovurdering (Forutsetninger – lav risiko)",
      description:
        "ALLE punkter må kunne besvares JA for at forenklet dokumentasjon kan benyttes. Hvis ikke: bruk komplett 5 Sikre-dokumentasjon.",
      fields: [
        {
          key: "risikovurdering_forutsetninger",
          label: "Forutsetninger",
          kind: "yna_group",
          items: [
            {
              key: "forutsatt_bruk",
              label:
                "Foreligger det tilstrekkelig informasjon til å kunne vurdere forutsatt bruk?",
            },
            {
              key: "ytre_paavirkning_51a",
              label:
                "Er ytre påvirkninger å anse som normale i forhold til Nek 400 tabell 51A?",
            },
            {
              key: "paavirker_eksisterende",
              label:
                "Har du tatt høyde for at nyinstallasjoner/endringer kan påvirke evt. eksisterende anlegg?",
            },
            {
              key: "info_eksisterende",
              label:
                "Foreligger det tilstrekkelig informasjon om løsningene som er lagt til grunn i eksisterende anlegg?",
            },
            {
              key: "paavirker_sikkerhet",
              label:
                "Er det åpenbart at arbeidet ikke vil påvirke forutsetningene som er lagt til grunn for sikkerheten i eksisterende installasjon?",
            },
            {
              key: "ikke_nek400_del7",
              label:
                "Er det åpenbart at endringer/utvidelse ikke vil kunne kategoriseres under installasjoner som omfattes av NEK 400 del 7 og arbeid på utstyr som batteri, likeretter, UPS, diesel-/bensinaggregat?",
            },
            {
              key: "utstyr_bruk_temperatur",
              label: "Er utstyr valgt i forhold til bruk og temperatur?",
            },
          ],
        },
      ],
    },
    {
      title: "Sjekkpunkt — Sluttkontroll",
      fields: [
        {
          key: "sluttkontroll",
          label: "Sluttkontroll",
          kind: "yna_measurement_group",
          measurementHeader: "Verdi",
          items: [
            {
              key: "kontinuitet",
              label:
                "Er kontinuitet i beskyttelsesledere og utjevningsforbindelser målt og funnet i orden?",
            },
            {
              key: "isolasjon",
              label: "Er isolasjonsmåling utført og funnet i orden?",
            },
            {
              key: "andre_malinger",
              label:
                "Er andre nødvendige målinger og prøving av den nye installasjonen utført og funnet i orden?",
            },
            {
              key: "arbeid_kontrollert",
              label: "Er utført arbeid kontrollert og funnet i orden?",
            },
            {
              key: "utstyr_paavirkning",
              label:
                "Er benyttet utstyr tilpasset ytre påvirkninger, spenningsnivå og bruk?",
            },
            {
              key: "utstyr_anvisning",
              label:
                "Er utstyr valgt og montert iht produsentens anvisning?",
            },
            {
              key: "funksjonsprovd",
              label: "Er utstyret funksjonsprøvd og funnet i orden?",
            },
            {
              key: "merking",
              label: "Er nødvendig merking av utstyr utført?",
            },
            {
              key: "dokumentasjon",
              label:
                "Foreligger dokumentasjon som er nødvendig for sikker bruk og vedlikehold?",
            },
          ],
        },
      ],
    },
  ],
};
