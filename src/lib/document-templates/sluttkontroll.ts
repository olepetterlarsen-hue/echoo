import type { TemplateDef } from "./types";

// Sluttkontroll v3.4 (rev 19.10.2022)
// Rapport fra sluttkontroll etter arbeid på elektriske anlegg.

export const SLUTTKONTROLL: TemplateDef = {
  kind: "sluttkontroll",
  title: "Sluttkontroll",
  subtitle: "Rapport fra sluttkontroll etter arbeid på elektriske anlegg",
  revision: "v3.4 · 19.10.2022",
  sections: [
    {
      title: "Info",
      fields: [
        { key: "site_id", label: "Site ID", kind: "text" },
        { key: "ordre_referanse", label: "Ordrereferanse", kind: "text" },
      ],
    },
    {
      title: "Rapportens omfang",
      fields: [
        { key: "omfang", label: "Omfang", kind: "scope_subform" },
      ],
    },
    {
      title: "Sjekkpunkt — Risikovurdering",
      fields: [
        {
          key: "risikovurdering",
          label: "Risikovurdering",
          kind: "yna_group",
          items: [
            {
              key: "foretatt_risiko",
              label: "Er det foretatt risikovurdering av anlegget?",
            },
          ],
        },
      ],
    },
    {
      title: "Sjekkpunkt — Visuell kontroll",
      description: "Ja / Nei / Uaktuelt + kommentar pr. punkt.",
      fields: [
        {
          key: "visuell",
          label: "Visuell kontroll",
          kind: "yna_group",
          items: [
            { key: "utstyr_ce", label: "Er utstyr montert iht monteringsanvisning og CE-merket dersom det er påkrevet?" },
            { key: "festet", label: "Er kabler og utstyr betryggende festet?" },
            { key: "ip2x", label: "Er alle spenningsførende deler beskyttet av IP2X-kapsling eller bedre?" },
            { key: "jordelektroder", label: "Er jordelektroder og utjevningsforbindelser tilkoblet?" },
            { key: "jordet_ujordet", label: "Har du sjekket at det ikke er blandet jordet og ujordet utstyr i samme «rom»?" },
            { key: "brannskiller", label: "Har du tettet alle gjennomføringer i brannskiller?" },
            { key: "kabeltverrsnitt", label: "Er kabeltverrsnitt valgt riktig med hensyn til spenningsfall og strømføringsevne?" },
            { key: "effektbrytere", label: "Er effektbrytere/motorvernbrytere riktig justert?" },
            { key: "jordfeilbrytere", label: "Er jordfeilbrytere riktig valgt ift type og utløsestrøm?" },
            { key: "frakobling_nodstopp", label: "Er det valgt nødvendig frakobling, sikkerhetsbryter, nødstopp og nullspenningsutløser?" },
            { key: "ip_grad", label: "Har tilkoblet utstyr IP-grad tilpasset omgivelsene?" },
            { key: "merking_leder", label: "Er merking av PEN-, PE- og N-leder utført?" },
            { key: "anlegg_merket", label: "Er anlegget tilstrekkelig merket?" },
            { key: "tilkoblinger", label: "Er alle tilkoblinger riktig utført?" },
            { key: "skjult_varme", label: "Er skjult varme dokumentert og eier informert?" },
            { key: "drift_vedlikehold", label: "Er det nødvendig adgang for drift og vedlikehold?" },
            { key: "selektivitet", label: "Er selektiviteten i anlegget kontrollert?" },
            { key: "advarsel_dok", label: "Er advarselstekster montert og nødvendig dokumentasjon/informasjon overlevert til eier/bruker?" },
            { key: "overspenningsvern", label: "Er det montert nødvendige overspenningsvern?" },
          ],
        },
      ],
    },
    {
      title: "Sjekkpunkt — Måling/Prøving",
      description: "Ja / Nei / Uaktuelt + kommentar + målt verdi.",
      fields: [
        {
          key: "maling",
          label: "Måling / Prøving",
          kind: "yna_measurement_group",
          measurementHeader: "Verdi",
          items: [
            { key: "kontinuitet", label: "Er det målt kontinuitet i beskyttelsesledere og utjevningsforbindelser?" },
            { key: "isolasjon", label: "Er det utført isolasjonsmåling?" },
            { key: "overgangsmotstand", label: "Er det målt eller beregnet overgangsmotstand på jordelektroden? Angi metode og verdi." },
            { key: "automatisk_utkobling", label: "Er det kontrollert at kursene har automatisk utkobling?" },
            { key: "gulv_vegg", label: "Er det målt gulv- og veggresistans?" },
            { key: "spenningsfall", label: "Er det kontrollert spenningsfall?" },
            { key: "funksjonstest", label: "Er anlegget funksjonstestet?" },
            { key: "polaritet", label: "Er det foretatt polaritetskontroll?" },
          ],
        },
      ],
    },
    {
      title: "Anleggsbeskrivelse / Spesielle forhold / Eventuelle forbehold",
      fields: [
        {
          key: "anleggsbeskrivelse",
          label: "Beskrivelse",
          kind: "textarea",
        },
      ],
    },
  ],
};
