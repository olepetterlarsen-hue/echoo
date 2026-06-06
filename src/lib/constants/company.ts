// Placeholder-bedriftsinformasjon brukt før en organisasjon er konfigurert
// (f.eks. på signup-siden eller hvis lookup feiler). I praksis hentes
// faktisk firma-info fra organizations.settings via getCurrentOrgSettings()
// i src/lib/org-settings.ts og overstyrer disse defaultene.
export const COMPANY = {
  firma: "Bedriftsnavn",
  kontaktperson: "",
  adresse: "",
  postnr: "",
  sted: "",
  telefon: "",
  epost: "",
  orgNr: "",
} as const;
