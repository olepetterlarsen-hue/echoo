import type { TemplateDef } from "./types";

// Risikovurdering v3.4 (rev 19.10.2022) — forenklet til bolig/næring.
// Telekom-spesifikke sjekkpunkter er fjernet siden de fleste prosjekter ikke
// involverer Telenor-infrastruktur. Hvis det trengs kan admin legge til via
// /admin/maler eller lage en egendefinert variant.

export const RISIKOVURDERING: TemplateDef = {
  kind: "risikovurdering",
  title: "Risikovurdering",
  subtitle: "Rapport fra risikovurdering",
  revision: "v3.4 · 19.10.2022",
  sections: [
    {
      title: "Ordre",
      fields: [
        {
          key: "ordre_referanse",
          label: "Ordrereferanse",
          kind: "text",
          prefilledFrom: "project.project_number",
        },
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
      title: "Rapportens omfang",
      fields: [
        {
          key: "omfang",
          label: "Omfang",
          kind: "scope_subform",
        },
      ],
    },
    {
      title: "Sjekkpunkt — Anleggssikkerhet",
      description: "Ja / Nei / Uaktuelt + kommentar pr. punkt.",
      fields: [
        {
          key: "anleggssikkerhet",
          label: "Anleggssikkerhet",
          kind: "yna_group",
          items: [
            { key: "nek400_spesielle", label: "Har du tatt hensyn til spesielle krav i NEK 400?" },
            { key: "nek400_planlegging", label: "Skal oppdraget planlegges og utføres iht gjeldende NEK 400?" },
            { key: "tek", label: "Har du tatt hensyn til spesielle krav i TEK?" },
            { key: "ytre_paavirkning", label: "Er de ytre påvirkningene for installasjonen normale?" },
            { key: "bruk", label: "Har du nødvendig informasjon om hva installasjonen skal brukes til?" },
            { key: "nytt_eksisterende", label: "Har du nødvendige opplysninger om nytt og evt. eksisterende utstyr?" },
            { key: "jording", label: "Har du nødvendig informasjon for å planlegge jordingsanlegget?" },
            { key: "overspenning", label: "Har du vurdert type overspenningsbeskyttelse?" },
            { key: "lys_varme", label: "Kan du se bort i fra eventuell risiko forbundet med lys- og varmeutstyr med høy overflatetemperatur?" },
            { key: "utvendig_kabel", label: "Kan du se bort i fra eventuell risiko forbundet med utvendig kabelanlegg i luft og/eller jord?" },
            { key: "uten_inngrep", label: "Skal arbeidet utføres uten inngrep i en eksisterende installasjon?" },
            { key: "eksisterende_feil", label: "Har du klarlagt at eksisterende anlegg ikke har feil/mangler som er forskriftsstridige eller som kan ha innvirkning på nyinstallasjonen?" },
            { key: "ikke_svekke", label: "Har du sikret at nyinstallasjoner ikke svekker sikkerhet og/eller funksjonalitet i eksisterende anlegg?" },
            { key: "koordinert", label: "Er arbeidet koordinert tilstrekkelig med andre fag?" },
            { key: "bygningsteknisk", label: "Kan oppdraget utføres uten fare for å forringe kvaliteten på øvrig bygningsteknisk utførelse?" },
            { key: "beregninger", label: "Er det nødvendig med elektrotekniske beregninger (IK-verdier er utenfor grenseverdier i tabell) for å verifisere forskriftens sikkerhetskrav?" },
          ],
        },
      ],
    },
    {
      title: "Sjekkpunkt — Kompetanse",
      fields: [
        {
          key: "kompetanse",
          label: "Kompetanse",
          kind: "yna_group",
          items: [
            {
              key: "riktig_kompetanse",
              label: "Har personale som skal utføre installasjonen riktig kompetanse?",
            },
          ],
        },
      ],
    },
    {
      title: "Sjekkpunkt — Eventuelt",
      fields: [
        {
          key: "eventuelt",
          label: "Eventuelt",
          kind: "yna_group",
          items: [
            {
              key: "alle_forhold",
              label:
                "Har du vurdert alle forhold og har tilgang til alle opplysninger som har betydning for denne risikovurderingen?",
            },
          ],
        },
      ],
    },
    {
      title: "Sjekkpunkt — Informasjon",
      fields: [
        {
          key: "informasjon",
          label: "Informasjon",
          kind: "yna_group",
          items: [
            {
              key: "informert_eier",
              label:
                "Har du informert eier/bruker om de valg du har lagt til grunn for prosjekteringen?",
            },
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
