import type { TemplateDef } from "./types";

// Stikkprøvekontroll — bedriftens kontrollskjema.
// 9 seksjoner, 61 spørsmål totalt. Brukes for å styrke HMS-arbeid og
// bekrefte etterlevelse av instrukser/retningslinjer.

export const STIKKPROVEKONTROLL: TemplateDef = {
  kind: "stikkprovekontroll",
  title: "Stikkprøvekontroll",
  subtitle: "Bedriftens kontrollskjema",
  revision: "v1.0",
  description:
    "Gjennomføring av stikkprøvekontroller har som mål å: styrke HMS-arbeidet i bedriften, redusere fraværsskader, øke bevisstheten for sikkerhet hos den enkelte, sikre synlig ledelse ute i virksomheten, bekrefte riktig bruk av verneutstyr, overvåke etterlevelse av instrukser og retningslinjer.",
  sections: [
    {
      title: "Seksjon 1: Kontrollinformasjon",
      fields: [
        { key: "dato_utfort", label: "Dato kontrollen ble utført", kind: "date", required: true },
        { key: "utforende_firma", label: "Utførende firma", kind: "text" },
        { key: "personell_tilstede", label: "Personell tilstede", kind: "textarea" },
        { key: "team_leder", label: "Hvem er team leder for utførende", kind: "text" },
        { key: "ansvarlig_pl", label: "Hvem er ansvarlig PL", kind: "text" },
        { key: "kontrollansvarlig", label: "Kontrollansvarlig", kind: "text", required: true },
        { key: "prosjektnummer_kontroll", label: "Prosjektnummer", kind: "text" },
        { key: "site_id", label: "Site ID", kind: "text" },
      ],
    },
    {
      title: "Seksjon 2: Utførende firma / personell",
      fields: [
        {
          key: "firma_personell",
          label: "Sjekkpunkter",
          kind: "yna_group",
          items: [
            { key: "hms_kort", label: "Har alle HMS-kort?" },
            { key: "dok_opplæring", label: "Dokumentasjon på nødvendig opplæring?" },
            { key: "profilert_firma", label: "Profilert firmabil og klær?" },
            { key: "pvu_brukes", label: "Brukes påkrevd personlig verneutstyr?" },
            { key: "firmabil_utstyrt", label: "Er firmabilen tilfredsstillende utstyrt og skodd for oppdraget?" },
            { key: "engelsk_kommunikasjon", label: "Språk og nasjonalitet — mulig å kommunisere på engelsk?" },
            { key: "sja_signert", label: "Er SJA utfylt og signert?" },
          ],
        },
      ],
    },
    {
      title: "Seksjon 3: Tilkomst til arbeidsområde",
      fields: [
        {
          key: "tilkomst",
          label: "Tilkomst",
          kind: "yna_group",
          items: [
            { key: "sone_trygg", label: "Er tilkomstsonen trygg å ferdes i? (sperret av område rundt mast når klatring pågår?)" },
            { key: "trapper_stiger", label: "Er trapper/stiger av permanent eller midlertidig type (er evt. atkomststige lang nok og sikker)?" },
            { key: "kollektive_sikring", label: "Er kollektive sikringstiltak (f.eks. rekkverk) på plass?" },
            { key: "innvendig_utvendig", label: "Er tilkomst innvendig eller utvendig?" },
            { key: "kant_2m", label: "Er noen tilkomstssoner mindre enn 2 meter fra kanter?" },
          ],
        },
      ],
    },
    {
      title: "Seksjon 4: Arbeid i høyden",
      fields: [
        {
          key: "hoyde",
          label: "Arbeid i høyden",
          kind: "yna_group",
          items: [
            { key: "sikret_hoyde", label: "Er arbeidsområdet tilstrekkelig sikret for arbeid i høyden?" },
            { key: "fallsikring_godkjent", label: "Brukes godkjent fallsikringsutstyr?" },
            { key: "kollektiv_hoyde", label: "Er kollektiv sikring til stede?" },
            { key: "sperrekjettinger", label: "Er sperrekjettinger (minst 2 m fra kant) påkrevd på plass?" },
            { key: "apninger_gulv", label: "Er det fare for fall pga. åpninger i gulv o.l.?" },
            { key: "nedfiringssett", label: "Finnes det komplett nedfiringssett i direkte nærhet ved mastearbeid?" },
          ],
        },
      ],
    },
    {
      title: "Seksjon 5: Annet",
      fields: [
        {
          key: "annet",
          label: "Andre forhold",
          kind: "yna_group",
          items: [
            { key: "boforhold", label: "Er boforhold i henhold til standard?" },
            { key: "arbeidstid", label: "Er arbeidstidsordningen forsvarlig?" },
            { key: "erfaring", label: "Har arbeidstakere relevant arbeidserfaring?" },
            { key: "regler_rutiner", label: "Er arbeidstakere kjent med gjeldende regler og rutiner?" },
            { key: "tilrettelegging", label: "Mangler det tilrettelegging for noen arbeidstakere?" },
            { key: "rapportere_skader", label: "Er de kontrollerte klar over at de skal rapportere skader, nestenulykker og farlige forhold?" },
            { key: "ruh_app", label: "Er de kjent med RUH-appen og hvordan den brukes for rapportering?" },
            { key: "sikkerhetsinstruks", label: "Utføres arbeidet i henhold til gjeldende sikkerhetsinstruksjoner?" },
            { key: "instruks_tilgang", label: "Har de utførende tilgang og kunnskap om gjeldende sikkerhetsinstrukser?" },
            { key: "avfallssortering", label: "Har utførende kunnskap om hvordan de skal sortere avfall og hvor det skal deponeres?" },
          ],
        },
      ],
    },
    {
      title: "Seksjon 6: Dokumentasjon",
      fields: [
        {
          key: "elektriker_paa_stedet",
          label: "Finnes det en elektriker på stedet? Hvem er ansvarlig for utførelse av elektroarbeid?",
          kind: "text",
        },
        {
          key: "dokumentasjon",
          label: "Dokumentasjon",
          kind: "yna_group",
          items: [
            { key: "risiko_for_elektro", label: "Er det utført risikovurdering FØR utførelse av elektroarbeid?" },
            { key: "brannslukker_godkjent", label: "Er det godkjent brannslukker (6 kg pulver)? Ved varmearbeid skal det være 2." },
            { key: "forstehjelp_tilgjengelig", label: "Er det førstehjelpsutstyr tilgjengelig?" },
          ],
        },
      ],
    },
    {
      title: "Seksjon 7: Kurs / sertifikater",
      fields: [
        {
          key: "kurs",
          label: "Gyldige kurs og sertifikater",
          kind: "yna_group",
          items: [
            { key: "fallsikring_kurs", label: "Har personell gyldig fallsikringskurs (opplæring for arbeid i høyden)?" },
            { key: "arlig_nedfiring", label: "Årlig nedfiring?" },
            { key: "lift_sertifikat", label: "Lift-sertifikat?" },
            { key: "varme_arbeider", label: "Varme arbeider?" },
            { key: "hms_kurs", label: "HMS-kurs?" },
            { key: "anhuker_kurs", label: "Anhuker-kurs?" },
            { key: "k1", label: "K1?" },
            { key: "smaverktoy_opplaering", label: "Dokumentert opplæring for maskiner og utstyr i bruk (småverktøy)?" },
            { key: "forstehjelp_kurs", label: "Gyldig førstehjelpskurs?" },
            { key: "asbest_kompetanse", label: "Har personell kompetanse på asbest (ved behov)?" },
          ],
        },
      ],
    },
    {
      title: "Seksjon 8: Personlig verneutstyr",
      fields: [
        {
          key: "pvu",
          label: "Bruker alle påkrevd verneutstyr?",
          kind: "yna_group",
          items: [
            { key: "hjelm", label: "Bruker alle hjelm?" },
            { key: "vernesko", label: "Bruker alle vernesko?" },
            { key: "synlighet", label: "Bruker alle synlighetsklær?" },
            { key: "horselvern", label: "Bruker alle hørselvern?" },
            { key: "vernebriller", label: "Bruker alle vernebriller?" },
            { key: "fallsele", label: "Bruker alle personlig fallsele?" },
            { key: "stovmaske", label: "Bruker alle støvmaske?" },
            { key: "hansker", label: "Bruker alle hansker?" },
            { key: "vei_tunell", label: "Arbeid i vei/tunnel — er det sperret, skiltet og evt. andre arbeidsvarslingstiltak på plass?" },
          ],
        },
      ],
    },
    {
      title: "Seksjon 9: Forslag til forbedring og oppfølging",
      fields: [
        {
          key: "forslag_forbedring",
          label: "Hva foreslår du kan gjøres for å ivareta din sikkerhet på en bedre måte?",
          kind: "textarea",
        },
        {
          key: "ruh_opprettet",
          label: "Er det opprettet RUH (Rapport Uønskede Hendelser) i forbindelse med denne kontrollen som skal følges opp videre?",
          kind: "yes_no",
        },
        {
          key: "ruh_referanse",
          label: "Referanse til RUH (hvis ja)",
          kind: "text",
        },
      ],
    },
  ],
};
