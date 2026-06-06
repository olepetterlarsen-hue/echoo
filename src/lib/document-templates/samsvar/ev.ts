import type { TemplateDef } from "../types";
import {
  SAMSVAR_INFO_SECTION,
  SAMSVAR_ANLEGG_KONTAKT_SECTION,
  SAMSVAR_ARBEIDSBESKRIVELSE_SECTION,
  SAMSVAR_ERKLAERING_SECTION,
} from "./shared";

// Samsvarserklæring — Ladeanlegg / EV
// For elbil-ladestasjoner — NEK 400-7-722, IEC 61851.

export const SAMSVAR_EV: TemplateDef = {
  kind: "samsvarserklaering",
  title: "Samsvarserklæring — Ladeanlegg / EV",
  subtitle: "Samsvarserklæring for ladestasjon (NEK 400-7-722)",
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
          label: "Type ladeanlegg",
          kind: "select",
          options: [
            "Hjemmelader (Mode 3, AC)",
            "Bedriftslader (Mode 3, AC)",
            "Offentlig ladestasjon (Mode 3, AC)",
            "Hurtiglader (Mode 4, DC)",
            "Lynlader (Mode 4, DC, >150 kW)",
            "Annet — se kommentar",
          ],
        },
        { key: "antall_punkter", label: "Antall ladepunkter", kind: "number" },
        { key: "effekt_per_punkt", label: "Effekt per punkt (kW)", kind: "number" },
        { key: "total_effekt", label: "Total tilkoblet effekt (kW)", kind: "number" },
        {
          key: "anvendte_normer",
          label: "Anvendte normer",
          kind: "anvendte_normer_subform",
          hint: "NEK 400-7-722 er obligatorisk, samt IEC 61851",
        },
        {
          key: "type_arbeid",
          label: "Type arbeid",
          kind: "checkmark_group",
          options: [
            "Nyanlegg",
            "Hovedforsyning til lader",
            "Ladestasjon (montering)",
            "Belastningsstyring / smartlading",
            "Måler / fakturasystem",
            "Skilt og merking",
            "Annet — skriv i kommentarfeltet",
          ],
        },
        {
          key: "fabrikat_modell",
          label: "Ladestasjon fabrikat og modell",
          kind: "text",
          hint: "f.eks. Easee Home, Zaptec Pro",
        },
      ],
    },
    SAMSVAR_ARBEIDSBESKRIVELSE_SECTION,
    {
      title: "Forutsetninger — EV-spesifikt",
      fields: [
        {
          key: "forutsetninger_ev",
          label: "Sjekkpunkter NEK 400-7-722",
          kind: "yna_group",
          items: [
            { key: "rcd_typeb", label: "RCD type B (eller intern likestrømsdetektering) installert?" },
            { key: "ce_merket", label: "Ladestasjon CE-merket og typegodkjent?" },
            { key: "effektberegning", label: "Effekt- og dimensjoneringsberegning utført?" },
            { key: "kabel_dim", label: "Kabel dimensjonert for kontinuerlig last (faktor 0,8)?" },
            { key: "ip_grad", label: "IP-grad tilpasset montasjested?" },
            { key: "merking_lader", label: "Skilt og merking ved ladepunkt etter forskrift?" },
            { key: "belastningsstyring", label: "Belastningsstyring / dynamisk kapasitet aktivert?" },
            { key: "internett_oppdatering", label: "Internett-tilkobling for fjernoppdatering testet?" },
            { key: "tjenestestopp", label: "Nødstopp / frakobling lett tilgjengelig?" },
          ],
        },
      ],
    },
    {
      title: "Måling og funksjonsprøving",
      fields: [
        {
          key: "maling_ev",
          label: "Måleresultater",
          kind: "yna_measurement_group",
          measurementHeader: "Verdi",
          items: [
            { key: "isolasjon", label: "Isolasjonsmotstand (MΩ)" },
            { key: "kontinuitet", label: "Kontinuitet PE (Ω)" },
            { key: "jordfeil_utlost", label: "Jordfeilbryter utløst på testknapp?" },
            { key: "rcd_typeb_test", label: "RCD type B testet med DC-feilsimulator?" },
            { key: "polaritet", label: "Polaritetskontroll OK?" },
            { key: "ladetest", label: "Ladetest med kjøretøy/test-utstyr OK?" },
          ],
        },
      ],
    },
    SAMSVAR_ERKLAERING_SECTION,
  ],
};
