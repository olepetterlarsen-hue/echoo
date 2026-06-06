// GHS-fareklasser brukt i stoffkartotek. Hver kode har en standard farge,
// emoji-ish ikon (vi rendrer som tekst + badge) og norsk beskrivelse.

export type GhsCode =
  | "GHS01"
  | "GHS02"
  | "GHS03"
  | "GHS04"
  | "GHS05"
  | "GHS06"
  | "GHS07"
  | "GHS08"
  | "GHS09";

export interface GhsInfo {
  code: GhsCode;
  label_no: string;
  label_en: string;
  short: string;
  description: string;
  color: string;
}

export const GHS_PICTOGRAMS: Record<GhsCode, GhsInfo> = {
  GHS01: {
    code: "GHS01",
    label_no: "Eksplosiv",
    label_en: "Explosive",
    short: "💥",
    description: "Eksplosiv ved oppvarming, støt eller friksjon.",
    color: "#D7152C",
  },
  GHS02: {
    code: "GHS02",
    label_no: "Brannfarlig",
    label_en: "Flammable",
    short: "🔥",
    description: "Brannfarlig væske og damp, kan antennes lett.",
    color: "#F47920",
  },
  GHS03: {
    code: "GHS03",
    label_no: "Oksiderende",
    label_en: "Oxidizing",
    short: "○",
    description: "Kan forårsake eller forsterke brann (oksiderende).",
    color: "#FACC15",
  },
  GHS04: {
    code: "GHS04",
    label_no: "Gass under trykk",
    label_en: "Compressed gas",
    short: "⊙",
    description: "Inneholder gass under trykk. Kan eksplodere ved oppvarming.",
    color: "#10A64A",
  },
  GHS05: {
    code: "GHS05",
    label_no: "Etsende",
    label_en: "Corrosive",
    short: "⚠",
    description: "Etsende på hud, øyne og metaller.",
    color: "#003D7C",
  },
  GHS06: {
    code: "GHS06",
    label_no: "Akutt giftig",
    label_en: "Acute toxicity",
    short: "☠",
    description: "Giftig ved svelging, hud eller innånding.",
    color: "#7C3AED",
  },
  GHS07: {
    code: "GHS07",
    label_no: "Helsefare / irritasjon",
    label_en: "Health hazard / irritant",
    short: "!",
    description:
      "Forårsaker hudirritasjon, øye-irritasjon eller allergisk reaksjon.",
    color: "#EC4899",
  },
  GHS08: {
    code: "GHS08",
    label_no: "Helsefare langtid",
    label_en: "Health hazard long-term",
    short: "✥",
    description:
      "Kan forårsake kreft, fosterskade, organskader eller annen langtidseffekt.",
    color: "#A23E2A",
  },
  GHS09: {
    code: "GHS09",
    label_no: "Miljøfare",
    label_en: "Environmental hazard",
    short: "🌊",
    description: "Giftig for vannlevende organismer, med langtidseffekt.",
    color: "#0B722F",
  },
};

export const GHS_ORDER: GhsCode[] = [
  "GHS01",
  "GHS02",
  "GHS03",
  "GHS04",
  "GHS05",
  "GHS06",
  "GHS07",
  "GHS08",
  "GHS09",
];
