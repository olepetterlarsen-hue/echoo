// Standard markørfarge på kartet når en kunde ikke har eksplisitt valgt farge.
export const DEFAULT_MAP_COLOR = "#F47920";

// Foreslåtte kjedefarger — vises som hurtigvalg i fargevelgeren og
// settes som default ved CSV-import når mønsteret matcher kjeden.
export const CHAIN_COLOR_SUGGESTIONS: Record<string, string> = {
  "Kiwi": "#10A64A",
  "REMA 1000": "#D7152C",
  "Spar": "#0B722F",
  "Coop": "#003D7C",
  "Meny": "#003E7E",
  "Innom": "#FF6B00",
  "Helgelandssykehuset": "#00838F",
  "Max Arena": "#7C3AED",
};

// Returner forslag for en gitt kunde, eller default-oransje.
export function suggestedColor(customerName: string): string {
  return CHAIN_COLOR_SUGGESTIONS[customerName] ?? DEFAULT_MAP_COLOR;
}

// Palett som tilbys i fargevelgeren — dekker brand-kjedene + et par nøytrale.
export const COLOR_SWATCHES: { value: string; label: string }[] = [
  { value: "#F47920", label: "Oransje (standard)" },
  { value: "#10A64A", label: "Grønn (Kiwi)" },
  { value: "#D7152C", label: "Rød (REMA 1000)" },
  { value: "#0B722F", label: "Mørk grønn (Spar)" },
  { value: "#003D7C", label: "Mørk blå (Coop)" },
  { value: "#FF6B00", label: "Sterk oransje (Innom)" },
  { value: "#00838F", label: "Teal" },
  { value: "#7C3AED", label: "Lilla" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#FACC15", label: "Gul" },
  { value: "#6B7280", label: "Grå" },
];
