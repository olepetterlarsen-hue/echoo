import type { TemplateDef } from "./types";

// SJA — Telekom-variant basert på OPCOMs ROT741-mal.
// Brukes når project.installation_type = 'telecom'.
// 12 seksjoner med risikovurdering pr. punkt: Lav / Middels / Høy / N/A
// + besvarelse (tiltak). Dekker mast, kabling, helikopter osv.

export const SJA_TELEKOM: TemplateDef = {
  kind: "sja",
  title: "SJA — Telekom",
  subtitle: "Sikker Jobb Analyse — telekominfrastruktur",
  revision: "v1.0",
  description:
    "Endre navn til Site ID. Gå gjennom alle risikovurderinger — legg til punkter dersom det er forhold som ikke er dekket av malen.",
  sections: [
    {
      title: "1. Sikring av arbeidsområde",
      fields: [
        {
          key: "secured_tssr",
          label:
            "Er arbeidsområdet sikret og sikringstiltak beskrevet i TSSR montert forsvarlig? Last opp bilder som viser Swingup eller andre sikringstiltak i gruppechat før arbeidet kan starte.",
          kind: "yes_no",
        },
      ],
    },
    {
      title: "2. Levering av utstyr",
      fields: [
        {
          key: "delivery_risk",
          label: "Risiko ved levering / transport",
          kind: "risk_assessment_group",
          riskItems: [
            {
              key: "damaging_equipment",
              label: "Skade på utstyr",
              description: "Det er risiko for å skade utstyr under transport.",
            },
          ],
        },
      ],
    },
    {
      title: "3. Installasjonsarbeid — Generelt",
      fields: [
        {
          key: "install_general",
          label: "Risiko ved installasjon",
          kind: "risk_assessment_group",
          riskItems: [
            { key: "crawling", label: "Arbeid på knærne" },
            { key: "dust", label: "Støv" },
            {
              key: "asbestos",
              label: "Kontakt med asbestholdige materialer",
            },
            { key: "heavy_lifting", label: "Tunge løft" },
            { key: "noise", label: "Støy" },
            {
              key: "transport_heavy",
              label: "Transport av tungt utstyr inn og ut av bygg",
            },
          ],
        },
      ],
    },
    {
      title: "4. Varmt arbeid",
      fields: [
        {
          key: "hot_works_form",
          label:
            "Separat skjema for varmt arbeid må fylles ut dersom dette skal utføres. Sørg for at dette er gjort og at alle konsekvenser er vurdert.",
          kind: "yes_no",
        },
      ],
    },
    {
      title: "5. Demontering av master / kabel",
      fields: [
        {
          key: "removal_poles",
          label: "Risiko ved demontering av master/kabel",
          kind: "risk_assessment_group",
          riskItems: [
            {
              key: "dismantling",
              label:
                "Demontering av linjenett — ustabilitet pga. ujevn belastning",
              description: "Ustabilitet på grunn av ujevn belastning.",
            },
            {
              key: "fall_pole",
              label: "Fall med mast",
              description:
                "Masten kan knekke/velte: for stor belastning ved kabelkutt, gammel/råtten mast, dårlige barduner/festebraketter, ødelagte fjellfeste, undergraving, erosjon.",
            },
            {
              key: "frost_telecom",
              label: "Frost og telekommunikasjon — frossen mast",
            },
            {
              key: "labeling",
              label: "Merking av mast",
              description:
                "Mast er ikke korrekt merket, uklar merking, eller merkingen har falt av.",
            },
          ],
        },
      ],
    },
    {
      title: "6. Kartlegg omgivelsene",
      fields: [
        {
          key: "survey",
          label: "Farer i omgivelsene",
          kind: "risk_assessment_group",
          riskItems: [
            {
              key: "fall_terrain",
              label: "Fallrisiko pga. stup, ujevnt terreng osv.",
            },
          ],
        },
      ],
    },
    {
      title: "7. Arbeid i stige",
      fields: [
        {
          key: "ladders",
          label: "Risiko ved stigearbeid",
          kind: "risk_assessment_group",
          riskItems: [
            {
              key: "fall_ladder",
              label: "Fall fra stige",
              description: "Sidelengs fall med stigen.",
            },
            {
              key: "falling_objects_ladder",
              label: "Fallende gjenstander fra høyden",
            },
            { key: "heavy_lifting_ladder", label: "Tunge løft (skader)" },
            { key: "pinch_ladder", label: "Klemfare, f.eks. fingre" },
            { key: "electric_ladder", label: "Stigen leder elektrisk strøm" },
            {
              key: "ladder_grind",
              label: "Stigen kan skli mens noen står i den",
            },
          ],
        },
      ],
    },
    {
      title: "8. Arbeid i mast / tårn",
      fields: [
        {
          key: "tower_poles",
          label: "Risiko ved arbeid i mast/tårn",
          kind: "risk_assessment_group",
          riskItems: [
            {
              key: "bad_weather",
              label: "Dårlige værforhold",
              description:
                "Vind, sikt — er værforholdene slik at arbeidet blir for farlig?",
            },
            {
              key: "damage_decay",
              label: "Skade på mast inkl. råte",
              description: "Masten kan knekke.",
            },
            { key: "falling_tower", label: "Fall fra tårn/mast" },
            { key: "falling_objects_tower", label: "Fallende gjenstander" },
            {
              key: "fall_cable_tension",
              label: "Fall ved fjerning av luftkabel fra bakkenivå pga. spenn",
            },
            {
              key: "heavy_lifting_tower",
              label: "Tunge løft",
              description: "Skader pga. feil løfteteknikk.",
            },
            {
              key: "mast_type",
              label: "Type mast",
              description: "Er masttypen kjent for arbeiderne fra før?",
            },
            { key: "pinch_tower", label: "Klemfare, f.eks. fingre" },
          ],
        },
      ],
    },
    {
      title: "9. Arbeid på mast/tak med utstyr i drift",
      fields: [
        {
          key: "masts_on",
          label: "Risiko ved aktivt utstyr",
          kind: "risk_assessment_group",
          riskItems: [
            { key: "radiation_induction", label: "Stråling, induksjon" },
          ],
        },
      ],
    },
    {
      title: "10. Kranaktiviteter",
      fields: [
        {
          key: "crane",
          label: "Risiko ved kranarbeid",
          kind: "risk_assessment_group",
          riskItems: [
            { key: "falling_crane", label: "Fallende utstyr pga. kranaktivitet" },
          ],
        },
      ],
    },
    {
      title: "11. Liftaktiviteter",
      fields: [
        {
          key: "lift",
          label: "Risiko ved liftarbeid",
          kind: "risk_assessment_group",
          riskItems: [
            { key: "falling_lift", label: "Fallende utstyr pga. arbeid i lift" },
            { key: "facade_lift", label: "Skade på fasade pga. arbeidet" },
            { key: "falling_basket", label: "Fall fra liftkurv" },
          ],
        },
      ],
    },
    {
      title: "12. Helikopter",
      fields: [
        {
          key: "heli_used",
          label: "Brukes helikopter for opp-/nedfiring?",
          kind: "yes_no",
        },
        {
          key: "heli_safety",
          label: "Hvilke sikkerhetstiltak er tatt for helikoptertransport av utstyr?",
          kind: "textarea",
        },
      ],
    },
  ],
};
