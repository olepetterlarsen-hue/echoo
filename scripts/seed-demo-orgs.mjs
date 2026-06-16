#!/usr/bin/env node
/**
 * seed-demo-orgs.mjs
 *
 * Idempotent seed av 3 demo-organisasjoner for Echoo:
 *   - Echoo Demo Elektro (elektro@echoo.no)     — ISO-modul, 10 prosjekter
 *   - Echoo Demo Tømrer  (tomrer@echoo.no)      — 3 byggeprosjekter
 *   - Echoo Demo Rørlegger (rorlegger@echoo.no) — 5 rørleggerprosjekter
 *
 * Passord: Demo1234! for alle.
 *
 * Kjør:
 *   npm run seed:demo
 *
 * Trygt å re-kjøre. Eksisterende demo-data slettes først, så seedes på nytt.
 * Det betyr at du kan trykke på alt i appen under en demo-runde, og
 * deretter "vaske" tilbake til ren tilstand med én kommando.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

// Minimal .env.local-leser (uten dotenv-avhengighet)
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SVC) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i env.");
  console.error("Sett dem i .env.local eller via shell:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:demo");
  process.exit(2);
}

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

const PASSWORD = "Demo1234!";

// ============================================================================
// Demo-data-definisjoner
// ============================================================================

const ELEKTRO = {
  email: "elektro@echoo.no",
  firma: "Echoo Demo Elektro AS",
  full_name: "Erik Volt",
  org_nr: "999000001",
  has_iso_addon: true,
  team: [
    { email: "elektriker1@echoo.no", full_name: "Per Strøm", role: "elektriker" },
    { email: "elektriker2@echoo.no", full_name: "Anne Sikring", role: "elektriker" },
    { email: "prosjektleder@echoo.no", full_name: "Kari Plan", role: "prosjektleder" },
  ],
  customers: [
    { name: "REMA 1000 Storgata", org_number: "991100001", contact_person: "Hanne Butikk", email: "hanne@rema-storgata.no", phone: "+47 900 10 001", address: "Storgata 12", postal_code: "0184", city: "Oslo" },
    { name: "Coop Mega Sentrum", org_number: "991100002", contact_person: "Bjørn Hylle", email: "bjorn@coop-mega.no", phone: "+47 900 10 002", address: "Karl Johans gate 8", postal_code: "0154", city: "Oslo" },
    { name: "Bygg & Bo AS", org_number: "991100003", contact_person: "Lise Eiendom", email: "lise@byggogbo.no", phone: "+47 900 10 003", address: "Industriveien 24", postal_code: "0668", city: "Oslo" },
    { name: "Skole-Eiendom Oslo", org_number: "991100004", contact_person: "Tor Renoverer", email: "tor@skole-eiendom.no", phone: "+47 900 10 004", address: "Tøyengata 4", postal_code: "0578", city: "Oslo" },
    { name: "Privatkunde Hansen", contact_person: "Trine Hansen", email: "trine.hansen@example.no", phone: "+47 900 10 005", address: "Solbakken 7", postal_code: "1338", city: "Sandvika" },
    { name: "Helsehus Vestkanten", org_number: "991100006", contact_person: "Dr. Sigrid Lege", email: "post@helsehus-vestkanten.no", phone: "+47 900 10 006", address: "Drammensveien 156", postal_code: "0277", city: "Oslo" },
  ],
  groups: [
    { name: "Team Service", color: "#3B82F6" },
    { name: "Team Nybygg", color: "#10B981" },
    { name: "Team Industri", color: "#a4682f" },
  ],
  sections: [{ name: "Innendørs" }, { name: "Utendørs" }, { name: "Service" }],
  projects: [
    { number: "2026-1001", title: "Rema 1000 Storgata — ombygging belysning", customerIdx: 0, status: "aktiv", sched: { start: -5, end: 7, group: "Team Service", section: "Innendørs", entryStatus: "in_progress" } },
    { number: "2026-1002", title: "Coop Mega — utskifting hovedtavle", customerIdx: 1, status: "aktiv", sched: { start: 2, end: 12, group: "Team Industri", section: "Innendørs", entryStatus: "planned" } },
    { number: "2026-1003", title: "Bygg & Bo — nybygg leilighetskompleks B3", customerIdx: 2, status: "aktiv", sched: { start: -10, end: 28, group: "Team Nybygg", section: "Innendørs", entryStatus: "in_progress" } },
    { number: "2026-1004", title: "Skole-Eiendom — rehabilitering klasserom", customerIdx: 3, status: "aktiv", sched: { start: 0, end: 14, group: "Team Service", section: "Innendørs", entryStatus: "planned" } },
    // Stack #1: to entries i samme team-lane samme uke — viser multi-lane stacking
    { number: "2026-1005", title: "Privatkunde Hansen — bad-renovering", customerIdx: 4, status: "aktiv", sched: { start: 3, end: 8, group: "Team Service", section: "Innendørs", entryStatus: "planned" } },
    { number: "2026-1006", title: "Privatkunde Hansen — kjeller TV-installasjon", customerIdx: 4, status: "aktiv", sched: { start: 5, end: 10, group: "Team Service", section: "Innendørs", entryStatus: "planned" } },
    { number: "2026-1007", title: "Helsehus Vestkanten — UPS-anlegg", customerIdx: 5, status: "aktiv", sched: { start: 10, end: 24, group: "Team Industri", section: "Innendørs", entryStatus: "planned" } },
    { number: "2026-1008", title: "Bygg & Bo — utvendig belysning P-hus", customerIdx: 2, status: "aktiv", sched: { start: 14, end: 21, group: "Team Nybygg", section: "Utendørs", entryStatus: "planned" } },
    { number: "2026-1009", title: "Rema 1000 Storgata — serviceavtale Q2", customerIdx: 0, status: "aktiv" },
    { number: "2026-1010", title: "Coop Mega — termografering kvartal", customerIdx: 1, status: "ferdigstilt" },
  ],
  tasks: [
    { projectNum: "2026-1001", title: "Bestill LED-armaturer", type: "documentation", status: "in_progress", dueOffset: 3, group: "Team Service" },
    { projectNum: "2026-1001", title: "Demontere gamle armaturer", type: "maintenance", status: "in_progress", dueOffset: 2, group: "Team Service" },
    { projectNum: "2026-1003", title: "Trekke fram kabler etasje 3", type: "maintenance", status: "in_progress", dueOffset: 5, group: "Team Nybygg" },
    { projectNum: "2026-1003", title: "Kursliste ferdigstilles", type: "documentation", status: "initiated", dueOffset: 10, group: "Team Nybygg" },
    { projectNum: "2026-1007", title: "Befaring UPS-rom", type: "inspection", status: "initiated", dueOffset: 8, group: "Team Industri" },
    { projectNum: "2026-1005", title: "Avtal oppstart med Trine Hansen", type: "coordination", status: "initiated", dueOffset: 1, group: "Team Service" },
    { projectNum: "2026-1002", title: "Bestilling hovedtavle", type: "documentation", status: "initiated", dueOffset: 4, group: "Team Industri" },
    { projectNum: "2026-1004", title: "Klargjør lyssett klasserom 201", type: "maintenance", status: "initiated", dueOffset: 6, group: "Team Service" },
  ],
};

const TOMRER = {
  email: "tomrer@echoo.no",
  firma: "Echoo Demo Tømrer AS",
  full_name: "Tor Tømmer",
  org_nr: "999000002",
  has_iso_addon: false,
  team: [
    { email: "tomrer1@echoo.no", full_name: "Lars Sag", role: "elektriker" }, // bruker elektriker-role som default
  ],
  customers: [
    { name: "Furuset Boligselskap", org_number: "992100001", contact_person: "Olav Bygger", email: "olav@furuset-boligselskap.no", phone: "+47 900 20 001", address: "Furusetveien 33", postal_code: "1086", city: "Oslo" },
    { name: "Smith Familien", contact_person: "Anna Smith", email: "anna.smith@example.no", phone: "+47 900 20 002", address: "Skogveien 5", postal_code: "1471", city: "Lørenskog" },
    { name: "Sentrum Eiendom AS", org_number: "992100003", contact_person: "Per Tak", email: "per@sentrum-eiendom.no", phone: "+47 900 20 003", address: "Storgata 1", postal_code: "0155", city: "Oslo" },
  ],
  groups: [
    { name: "Tømrerlag 1", color: "#a4682f" },
    { name: "Tømrerlag 2", color: "#10B981" },
  ],
  sections: [{ name: "Nybygg" }, { name: "Rehab" }],
  projects: [
    { number: "2026-2001", title: "Furuset — tilbygg vest 32m²", customerIdx: 0, status: "aktiv", sched: { start: 1, end: 21, group: "Tømrerlag 1", section: "Nybygg", entryStatus: "planned" } },
    { number: "2026-2002", title: "Smith — nytt kjøkken + spiseplass", customerIdx: 1, status: "aktiv", sched: { start: 7, end: 18, group: "Tømrerlag 2", section: "Rehab", entryStatus: "planned" } },
    { number: "2026-2003", title: "Sentrum Eiendom — vindusbytte Storgata 1", customerIdx: 2, status: "aktiv", sched: { start: 14, end: 24, group: "Tømrerlag 1", section: "Rehab", entryStatus: "planned" } },
  ],
  tasks: [
    { projectNum: "2026-2001", title: "Bestille reisverk", type: "documentation", status: "in_progress", dueOffset: 2, group: "Tømrerlag 1" },
    { projectNum: "2026-2001", title: "Søknad nabovarsel", type: "documentation", status: "initiated", dueOffset: 5, group: "Tømrerlag 1" },
    { projectNum: "2026-2002", title: "Måltaking kjøkken", type: "inspection", status: "in_progress", dueOffset: 3, group: "Tømrerlag 2" },
  ],
};

const RORLEGGER = {
  email: "rorlegger@echoo.no",
  firma: "Echoo Demo Rørlegger AS",
  full_name: "Roy Rørs",
  org_nr: "999000003",
  has_iso_addon: false,
  team: [
    { email: "rorlegger1@echoo.no", full_name: "Knut Vannlås", role: "elektriker" },
    { email: "rorlegger2@echoo.no", full_name: "Mona Avløp", role: "elektriker" },
  ],
  customers: [
    { name: "Borettslag Nordstrand", org_number: "993100001", contact_person: "Styreleder Hansen", email: "post@borettslag-nordstrand.no", phone: "+47 900 30 001", address: "Nordstrandveien 88", postal_code: "1163", city: "Oslo" },
    { name: "Hotell Sentrum AS", org_number: "993100002", contact_person: "Resepsjon", email: "drift@hotell-sentrum.no", phone: "+47 900 30 002", address: "Karl Johans gate 14", postal_code: "0154", city: "Oslo" },
    { name: "Skolebygg Bærum", org_number: "993100003", contact_person: "Vaktmester Olsen", email: "olsen@skole-baerum.no", phone: "+47 900 30 003", address: "Skoleveien 2", postal_code: "1338", city: "Sandvika" },
    { name: "Privatkunde Larsen", contact_person: "Hege Larsen", email: "hege.larsen@example.no", phone: "+47 900 30 004", address: "Bakkegata 11", postal_code: "0560", city: "Oslo" },
  ],
  groups: [
    { name: "Akutt service", color: "#EF4444" },
    { name: "Rehab-team", color: "#3B82F6" },
  ],
  sections: [{ name: "Bad og våtrom" }, { name: "Sanitær" }],
  projects: [
    { number: "2026-3001", title: "Borettslag Nordstrand — utskifting stigerør", customerIdx: 0, status: "aktiv", sched: { start: 0, end: 14, group: "Rehab-team", section: "Sanitær", entryStatus: "in_progress" } },
    { number: "2026-3002", title: "Hotell Sentrum — bad rom 201-210", customerIdx: 1, status: "aktiv", sched: { start: 3, end: 10, group: "Rehab-team", section: "Bad og våtrom", entryStatus: "planned" } },
    { number: "2026-3003", title: "Skolebygg Bærum — lekkasje gymsalen", customerIdx: 2, status: "aktiv", sched: { start: -2, end: 2, group: "Akutt service", section: "Sanitær", entryStatus: "in_progress" } },
    { number: "2026-3004", title: "Privatkunde Larsen — nytt baderom", customerIdx: 3, status: "aktiv", sched: { start: 8, end: 22, group: "Rehab-team", section: "Bad og våtrom", entryStatus: "planned" } },
    { number: "2026-3005", title: "Hotell Sentrum — serviceavtale Q2", customerIdx: 1, status: "aktiv" },
  ],
  tasks: [
    { projectNum: "2026-3003", title: "Akutt: finn lekkasje gymsal", type: "inspection", status: "in_progress", dueOffset: 0, group: "Akutt service" },
    { projectNum: "2026-3001", title: "Demontere gamle stigerør 1. etg", type: "maintenance", status: "in_progress", dueOffset: 4, group: "Rehab-team" },
    { projectNum: "2026-3002", title: "Bestilling kabinetter", type: "documentation", status: "initiated", dueOffset: 5, group: "Rehab-team" },
    { projectNum: "2026-3004", title: "Befaring privatkunde", type: "inspection", status: "initiated", dueOffset: 6, group: "Rehab-team" },
  ],
};

// ============================================================================
// Felles utvidelser — kursbevis, stoffkartotek, avvik, ISO
// ============================================================================

// Felles kursbevis-mal — assignes til hver bruker med variert utløpsdato
const CERTIFICATES_TEMPLATE = [
  { name: "FSE 2024", issuer: "Trainor", validMonths: 12, daysFromIssue: -180 },
  { name: "Førstehjelp", issuer: "Røde Kors", validMonths: 36, daysFromIssue: -200 },
  { name: "Varme arbeider", issuer: "Norsk Brannvern", validMonths: 60, daysFromIssue: -400 },
  { name: "Arbeid i høyden", issuer: "Trainor", validMonths: 24, daysFromIssue: -300 },
];

// Stoffkartotek-eksempler per bransje
const SUBSTANCES_ELEKTRO = [
  { name: "Kontaktrens KR-505", manufacturer: "CRC Industries", cas_number: "64742-49-0", usage_area: "Service og vedlikehold", storage_location: "Verkstedsbil", ghs_pictograms: ["GHS02","GHS07"], hazard_statements: "H222: Ekstremt brannfarlig aerosol. H319: Gir alvorlig øyeirritasjon.", precautionary_measures: "Bruk vernebriller. Ikke spray mot åpen flamme." },
  { name: "Loddetinn 60/40", manufacturer: "Stannol", cas_number: "7440-31-5", usage_area: "Loddearbeid på el-anlegg", storage_location: "Verksted hylle B3", ghs_pictograms: ["GHS08","GHS09"], hazard_statements: "H360: Kan skade forplantningsevne eller foster. H410: Meget giftig for vannlevende organismer.", precautionary_measures: "Bruk avtrekk. Hudkontakt unngås." },
  { name: "Isolerolje Shell Diala S4 ZX-I", manufacturer: "Shell", cas_number: "64742-54-7", usage_area: "Transformatorer", storage_location: "Container utenfor verksted", ghs_pictograms: ["GHS07","GHS09"], hazard_statements: "H315: Gir hudirritasjon. H411: Giftig for vannlevende organismer.", precautionary_measures: "Bruk hansker. Forhindre utslipp i avløp." },
  { name: "Silikon spray WD-40", manufacturer: "WD-40 Company", cas_number: "64742-47-8", usage_area: "Smøring av låser og bevegelige deler", storage_location: "Verkstedsbil", ghs_pictograms: ["GHS02","GHS07"], hazard_statements: "H222: Ekstremt brannfarlig aerosol.", precautionary_measures: "Beholder under trykk — beskytt mot sollys." },
];

const SUBSTANCES_TOMRER = [
  { name: "Trelim PVAc D3", manufacturer: "Casco", cas_number: "9003-20-7", usage_area: "Sammenfesting av treverk", storage_location: "Verksted lager", ghs_pictograms: [], hazard_statements: "Ikke klassifisert som farlig.", precautionary_measures: "Oppbevares utilgjengelig for barn." },
  { name: "Tre-impregnering Sioo", manufacturer: "Sioo Wood Protection", cas_number: "1310-58-3", usage_area: "Utvendig kledning", storage_location: "Garasje", ghs_pictograms: ["GHS05","GHS07"], hazard_statements: "H315: Hudirritasjon. H318: Alvorlig øyeskade.", precautionary_measures: "Bruk vernebriller og hansker." },
  { name: "Treolje gulv Trip Trap", manufacturer: "Trip Trap", cas_number: "8001-26-1", usage_area: "Innvendige tregulv", storage_location: "Hylle inne i bil", ghs_pictograms: ["GHS02"], hazard_statements: "H226: Brannfarlig væske og damp.", precautionary_measures: "Selvantenningsfare ved kluter — kluter i vann." },
];

const SUBSTANCES_RORLEGGER = [
  { name: "Loddepasta CU-XSn", manufacturer: "Sanha", cas_number: "7440-50-8", usage_area: "Lodding av kobberør", storage_location: "Verkstedsbil", ghs_pictograms: ["GHS07"], hazard_statements: "H315: Hudirritasjon. H319: Øyeirritasjon.", precautionary_measures: "Vask hender etter bruk." },
  { name: "Gjengetape PTFE", manufacturer: "Würth", usage_area: "Tetning av gjenger", storage_location: "Verkstedsbil", ghs_pictograms: [], hazard_statements: "Ikke klassifisert.", precautionary_measures: "Ingen særlige tiltak." },
  { name: "Avløpsåpner Klorinator", manufacturer: "Lilleborg", cas_number: "1310-73-2", usage_area: "Åpning av tette avløp", storage_location: "Garasje låst skap", ghs_pictograms: ["GHS05","GHS08"], hazard_statements: "H290: Korrosivt for metaller. H314: Gir alvorlige etseskader på hud og øyne.", precautionary_measures: "Bruk fullt verneutstyr. Aldri bland med syre." },
  { name: "Silikon-tetningsmasse våtrom", manufacturer: "Sika", cas_number: "70131-67-8", usage_area: "Bad og kjøkken", storage_location: "Verkstedsbil", ghs_pictograms: ["GHS07"], hazard_statements: "H317: Kan forårsake allergisk hudreaksjon.", precautionary_measures: "Bruk hansker." },
];

// Avvik-eksempler per org
const DEVIATIONS_ELEKTRO = [
  { projectNum: "2026-1003", title: "Feil dimensjonert kabel på kurs K14", severity: "hoey", status: "apen", description: "Under installasjon ble det oppdaget at kabel er 2,5mm² der det er prosjektert 4mm². Må byttes." },
  { projectNum: "2026-1001", title: "Manglende jordfeilbryter på utebelysning", severity: "middels", status: "under_arbeid", description: "Befaring viser at utebelysningskurs ikke har jordfeilbryter installert. Må ettermonteres før idriftsetting." },
  { projectNum: "2026-1007", title: "Feilbestilt UPS-modul", severity: "lav", status: "lukket", description: "Bestilte 5kVA, men behovet er 10kVA. Returnert til leverandør, ny på vei.", resolution: "Bestilling endret til 10kVA, leveringstid 2 uker." },
];

const DEVIATIONS_TOMRER = [
  { projectNum: "2026-2001", title: "Feil i tegninger — vindusplassering", severity: "middels", status: "apen", description: "Arkitekttegning viser vindu 120cm fra hjørne, men byggemelding er 150cm. Avklart med arkitekt." },
];

const DEVIATIONS_RORLEGGER = [
  { projectNum: "2026-3003", title: "Lekkasje i hovedstigerør gymsal — vannskade på rom under", severity: "hoey", status: "under_arbeid", description: "Stort vannutslipp pga sprukken kobberrør. Stengeventil var defekt. Vannskade meldt til forsikring." },
  { projectNum: "2026-3001", title: "Asbest oppdaget i isolering rundt rør", severity: "hoey", status: "apen", description: "Under demontering av gammelt rør ble det funnet asbestholdig isolering. Arbeid stoppet. Asbestsanering må gjennomføres først." },
];

// Required courses (org-spesifikke)
const REQUIRED_COURSES_ELEKTRO = [
  { name: "FSE 2024", description: "Forskrift om sikkerhet ved arbeid i og drift av elektriske anlegg", validity_months: 12, category: "Elsikkerhet" },
  { name: "Førstehjelp", description: "Grunnleggende førstehjelp", validity_months: 36, category: "HMS" },
  { name: "Varme arbeider", description: "Sertifikat for varme arbeider", validity_months: 60, category: "HMS" },
  { name: "Arbeid i høyden", description: "Fallsikring og arbeid i høyden", validity_months: 24, category: "HMS" },
];

const REQUIRED_COURSES_TOMRER = [
  { name: "Varme arbeider", description: "Sertifikat for varme arbeider", validity_months: 60, category: "HMS" },
  { name: "Arbeid i høyden", description: "Fallsikring og stillas", validity_months: 24, category: "HMS" },
  { name: "Førstehjelp", description: "Grunnleggende førstehjelp", validity_months: 36, category: "HMS" },
];

const REQUIRED_COURSES_RORLEGGER = [
  { name: "Sentralvarme grunnkurs", description: "Grunnleggende sentralvarmeanlegg", validity_months: null, category: "Fag" },
  { name: "Førstehjelp", description: "Grunnleggende førstehjelp", validity_months: 36, category: "HMS" },
  { name: "Varme arbeider", description: "Sertifikat for varme arbeider", validity_months: 60, category: "HMS" },
];

// ISO-data kun for Elektro (har has_iso_addon = true)
const ISO_OBJECTIVES_ELEKTRO = [
  { kind: "quality", title: "Reduser kundeklager med 20%", description: "Bedre rutinene for sluttkontroll og innkjøp.", target_value: "≤ 4 klager", unit: "antall", baseline_value: 5 },
  { kind: "environment", title: "Reduser energiforbruk på verksted 10%", description: "LED-konvertering + smart styring.", target_value: "≤ 9 000 kWh/år", unit: "kWh", baseline_value: 10000 },
  { kind: "quality", title: "100% av FSE-kurs gyldig hos alle elektrikere", description: "Følge opp utløpsdatoer månedlig.", target_value: "100%", unit: "%", baseline_value: 80 },
];

const ENV_ASPECTS_ELEKTRO = [
  { title: "Avhending av kabelrester", description: "Kobber + plast — restavfall fra installasjoner.", category: "waste", lifecycle: "normal", frequency_score: 5, severity_score: 2 },
  { title: "Drivstoffbruk firmabiler", description: "12 kjøretøy, hovedsakelig dieselbiler.", category: "energy", lifecycle: "normal", frequency_score: 5, severity_score: 4 },
  { title: "Utslipp av kjølemiddel ved varmepumpe-arbeid", description: "Skjer ved demontering — sertifisert personell håndterer.", category: "emissions_air", lifecycle: "abnormal", frequency_score: 2, severity_score: 5 },
];

ELEKTRO.certificates = CERTIFICATES_TEMPLATE;
ELEKTRO.substances = SUBSTANCES_ELEKTRO;
ELEKTRO.deviations = DEVIATIONS_ELEKTRO;
ELEKTRO.required_courses = REQUIRED_COURSES_ELEKTRO;
ELEKTRO.iso_objectives = ISO_OBJECTIVES_ELEKTRO;
ELEKTRO.env_aspects = ENV_ASPECTS_ELEKTRO;

TOMRER.certificates = CERTIFICATES_TEMPLATE.slice(1); // ingen FSE
TOMRER.substances = SUBSTANCES_TOMRER;
TOMRER.deviations = DEVIATIONS_TOMRER;
TOMRER.required_courses = REQUIRED_COURSES_TOMRER;

RORLEGGER.certificates = CERTIFICATES_TEMPLATE.slice(1); // ingen FSE
RORLEGGER.substances = SUBSTANCES_RORLEGGER;
RORLEGGER.deviations = DEVIATIONS_RORLEGGER;
RORLEGGER.required_courses = REQUIRED_COURSES_RORLEGGER;

const DEMO_ORGS = [ELEKTRO, TOMRER, RORLEGGER];

// ============================================================================
// Helpers
// ============================================================================

function isoDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

async function deleteExistingDemoData() {
  console.log("→ Sletter eksisterende demo-data (idempotent)…");
  const firmaNames = DEMO_ORGS.map((o) => o.firma);

  // Slett orgs — CASCADE rydder customers/projects/tasks/schedule/groups/sections
  const { data: existingOrgs } = await admin
    .from("organizations")
    .select("id")
    .in("firma", firmaNames);
  if (existingOrgs && existingOrgs.length > 0) {
    const ids = existingOrgs.map((o) => o.id);
    const { error } = await admin.from("organizations").delete().in("id", ids);
    if (error) throw new Error(`Slett orgs: ${error.message}`);
    console.log(`  ✓ Slettet ${ids.length} eksisterende demo-orgs (CASCADE)`);
  }

  // Slett auth-brukere på alle demo-eposter
  const allEmails = DEMO_ORGS.flatMap((o) => [
    o.email,
    ...o.team.map((t) => t.email),
  ]);
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const toDelete = (users?.users ?? []).filter((u) =>
    allEmails.includes(u.email?.toLowerCase() ?? ""),
  );
  for (const u of toDelete) {
    await admin.auth.admin.deleteUser(u.id).catch(() => {});
  }
  if (toDelete.length > 0) {
    console.log(`  ✓ Slettet ${toDelete.length} auth-brukere`);
  }
}

async function createAuthUser(email, password, fullName) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user.id;
}

async function seedOrg(demo) {
  console.log(`\n=== ${demo.firma} ===`);

  // 1. Admin-bruker + org via signup_organization
  const adminUserId = await createAuthUser(demo.email, PASSWORD, demo.full_name);
  console.log(`  ✓ Auth user (admin): ${demo.email}`);

  const { data: orgId, error: e2 } = await admin.rpc("signup_organization", {
    p_user_id: adminUserId,
    p_firma: demo.firma,
    p_org_nr: demo.org_nr,
    p_full_name: demo.full_name,
  });
  if (e2) throw new Error(`signup_organization: ${e2.message}`);
  console.log(`  ✓ Org: ${orgId}`);

  // 2. Sett trial langt fram + evt ISO-addon
  const trialEnd = new Date();
  trialEnd.setFullYear(trialEnd.getFullYear() + 5);
  await admin
    .from("organizations")
    .update({
      trial_ends_at: trialEnd.toISOString(),
      has_iso_addon: demo.has_iso_addon,
      subscription_status: "trialing",
    })
    .eq("id", orgId);

  // 3. Team-medlemmer
  const teamUserIds = [];
  for (const t of demo.team) {
    const uid = await createAuthUser(t.email, PASSWORD, t.full_name);
    await admin
      .from("profiles")
      .upsert(
        {
          id: uid,
          email: t.email,
          full_name: t.full_name,
          organization_id: orgId,
          role: t.role,
          active: true,
        },
        { onConflict: "id" },
      );
    teamUserIds.push({ id: uid, role: t.role });
    console.log(`  ✓ Team: ${t.email}`);
  }

  // 4. Groups (team-lanes på produksjonsplan)
  const groupIds = {};
  for (const g of demo.groups) {
    const { data, error } = await admin
      .from("groups")
      .insert({
        organization_id: orgId,
        name: g.name,
        color: g.color,
      })
      .select("id")
      .single();
    if (error) throw new Error(`group ${g.name}: ${error.message}`);
    groupIds[g.name] = data.id;
  }
  console.log(`  ✓ ${Object.keys(groupIds).length} grupper`);

  // 5. Gantt-sections
  const sectionIds = {};
  let sortIdx = 0;
  for (const s of demo.sections) {
    const { data, error } = await admin
      .from("gantt_sections")
      .insert({
        organization_id: orgId,
        name: s.name,
        sort_order: sortIdx++,
      })
      .select("id")
      .single();
    if (error) throw new Error(`section ${s.name}: ${error.message}`);
    sectionIds[s.name] = data.id;
  }

  // Koble grupper til seksjoner (første gruppe → første seksjon, osv.)
  const groupNames = demo.groups.map((g) => g.name);
  const sectionNames = demo.sections.map((s) => s.name);
  for (let i = 0; i < groupNames.length; i++) {
    const sectName = sectionNames[Math.min(i, sectionNames.length - 1)];
    await admin
      .from("groups")
      .update({
        gantt_section_id: sectionIds[sectName],
        gantt_sort_order: i,
      })
      .eq("id", groupIds[groupNames[i]]);
  }

  // 6. Customers
  const customerIds = [];
  for (const c of demo.customers) {
    const { data, error } = await admin
      .from("customers")
      .insert({
        organization_id: orgId,
        name: c.name,
        org_number: c.org_number ?? null,
        contact_person: c.contact_person ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        address: c.address ?? null,
        postal_code: c.postal_code ?? null,
        city: c.city ?? null,
        created_by: adminUserId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`customer ${c.name}: ${error.message}`);
    customerIds.push(data.id);
  }
  console.log(`  ✓ ${customerIds.length} kunder`);

  // 7. Projects + schedule_entries
  const projectIds = {};
  for (const p of demo.projects) {
    const c = demo.customers[p.customerIdx];
    const { data, error } = await admin
      .from("projects")
      .insert({
        organization_id: orgId,
        project_number: p.number,
        title: p.title,
        customer_name: c.name,
        customer_org_number: c.org_number ?? null,
        customer_contact: c.contact_person ?? null,
        customer_email: c.email ?? null,
        customer_phone: c.phone ?? null,
        site_address: c.address ?? null,
        site_postal_code: c.postal_code ?? null,
        site_city: c.city ?? null,
        status: p.status,
        created_by: adminUserId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`project ${p.number}: ${error.message}`);
    projectIds[p.number] = data.id;

    // Schedule-entry
    if (p.sched) {
      const { error: schedErr } = await admin.from("schedule_entries").insert({
        organization_id: orgId,
        project_id: data.id,
        group_id: groupIds[p.sched.group] ?? null,
        start_date: isoDate(p.sched.start),
        end_date: isoDate(p.sched.end),
        status: p.sched.entryStatus,
        created_by: adminUserId,
      });
      if (schedErr) throw new Error(`schedule ${p.number}: ${schedErr.message}`);
    }
  }
  console.log(`  ✓ ${demo.projects.length} prosjekter (${demo.projects.filter((p) => p.sched).length} på produksjonsplan)`);

  // 8. Tasks
  // Hent task_types for org-en så vi kan slå opp slug → row
  const { data: taskTypes } = await admin
    .from("task_types")
    .select("slug")
    .eq("organization_id", orgId);
  const validSlugs = new Set((taskTypes ?? []).map((t) => t.slug));

  let taskCount = 0;
  for (let i = 0; i < demo.tasks.length; i++) {
    const t = demo.tasks[i];
    const assignee =
      teamUserIds.length > 0
        ? teamUserIds[i % teamUserIds.length].id
        : adminUserId;
    const { error } = await admin.from("tasks").insert({
      organization_id: orgId,
      project_id: projectIds[t.projectNum],
      title: t.title,
      task_type_slug: validSlugs.has(t.type) ? t.type : null,
      status: t.status,
      assigned_to: assignee,
      group_id: groupIds[t.group] ?? null,
      due_date: t.dueOffset != null ? isoDate(t.dueOffset) : null,
      reported_by: adminUserId,
    });
    if (error) throw new Error(`task ${t.title}: ${error.message}`);
    taskCount++;
  }
  console.log(`  ✓ ${taskCount} oppgaver`);

  // 9. Kursbevis (certificates) — alle profiler får et komplett sett
  const allProfileIds = [adminUserId, ...teamUserIds.map((t) => t.id)];
  let certCount = 0;
  for (const profileId of allProfileIds) {
    for (const c of demo.certificates ?? []) {
      const issuedDate = isoDate(c.daysFromIssue);
      const expiresDate = c.validMonths
        ? isoDate(c.daysFromIssue + c.validMonths * 30)
        : null;
      const { error } = await admin.from("certificates").insert({
        organization_id: orgId,
        profile_id: profileId,
        name: c.name,
        issuer: c.issuer,
        issued_date: issuedDate,
        expires_date: expiresDate,
        file_path: `demo/${profileId}/${c.name.replace(/\s+/g, "-")}.pdf`,
      });
      if (error) throw new Error(`cert ${c.name}: ${error.message}`);
      certCount++;
    }
  }
  console.log(`  ✓ ${certCount} kursbevis (${allProfileIds.length} brukere × ${(demo.certificates ?? []).length} kurs)`);

  // 10. Required courses (kompetansematrise)
  let rcCount = 0;
  for (const rc of demo.required_courses ?? []) {
    const { error } = await admin.from("required_courses").insert({
      organization_id: orgId,
      name: rc.name,
      description: rc.description,
      validity_months: rc.validity_months,
      category: rc.category,
      is_active: true,
      created_by: adminUserId,
    });
    if (error) throw new Error(`required_course ${rc.name}: ${error.message}`);
    rcCount++;
  }
  console.log(`  ✓ ${rcCount} obligatoriske kurs`);

  // 11. Stoffkartotek
  let substCount = 0;
  for (const s of demo.substances ?? []) {
    const { error } = await admin.from("substances").insert({
      organization_id: orgId,
      name: s.name,
      manufacturer: s.manufacturer ?? null,
      cas_number: s.cas_number ?? null,
      usage_area: s.usage_area ?? null,
      storage_location: s.storage_location ?? null,
      ghs_pictograms: s.ghs_pictograms ?? [],
      hazard_statements: s.hazard_statements ?? null,
      precautionary_measures: s.precautionary_measures ?? null,
      created_by: adminUserId,
    });
    if (error) throw new Error(`substance ${s.name}: ${error.message}`);
    substCount++;
  }
  console.log(`  ✓ ${substCount} stoffer i kartotek`);

  // 12. Avvik
  let devCount = 0;
  for (const d of demo.deviations ?? []) {
    const { error } = await admin.from("deviations").insert({
      organization_id: orgId,
      project_id: projectIds[d.projectNum],
      title: d.title,
      description: d.description,
      severity: d.severity,
      status: d.status,
      resolution: d.resolution ?? null,
      reported_by: adminUserId,
      assigned_to:
        teamUserIds.length > 0 ? teamUserIds[0].id : adminUserId,
    });
    if (error) throw new Error(`deviation ${d.title}: ${error.message}`);
    devCount++;
  }
  if (devCount > 0) console.log(`  ✓ ${devCount} avvik`);

  // 13. ISO — kun for orgs med has_iso_addon
  if (demo.has_iso_addon) {
    let isoCount = 0;
    for (const obj of demo.iso_objectives ?? []) {
      const { error } = await admin.from("iso_objectives").insert({
        organization_id: orgId,
        kind: obj.kind,
        title: obj.title,
        description: obj.description,
        target_value: obj.target_value,
        unit: obj.unit,
        baseline_value: obj.baseline_value,
        created_by: adminUserId,
      });
      if (error) throw new Error(`iso_obj ${obj.title}: ${error.message}`);
      isoCount++;
    }
    for (const a of demo.env_aspects ?? []) {
      const { error } = await admin.from("env_aspects").insert({
        organization_id: orgId,
        title: a.title,
        description: a.description,
        category: a.category,
        lifecycle: a.lifecycle,
        frequency_score: a.frequency_score,
        severity_score: a.severity_score,
        created_by: adminUserId,
      });
      if (error) throw new Error(`env_aspect ${a.title}: ${error.message}`);
      isoCount++;
    }
    // En planlagt internrevisjon
    const { error: auditErr } = await admin.from("audit_plans").insert({
      organization_id: orgId,
      title: "Internrevisjon Q3 2026 — Dokumentstyring",
      scope: "ISO 9001 punkt 7.5: kontroll av dokumenter og registreringer",
      auditor_id: adminUserId,
      planned_date: isoDate(45),
      created_by: adminUserId,
    });
    if (auditErr) throw new Error(`audit_plan: ${auditErr.message}`);
    isoCount++;
    console.log(`  ✓ ${isoCount} ISO-elementer (mål, miljøaspekter, internrevisjon)`);
  }

  return { orgId, adminEmail: demo.email };
}

// ============================================================================
// Main
// ============================================================================

console.log(`Seed: ${URL.replace(/^https?:\/\//, "")}\n`);

await deleteExistingDemoData();

const results = [];
for (const demo of DEMO_ORGS) {
  const r = await seedOrg(demo);
  results.push(r);
}

console.log("\n========================================");
console.log("✓ Demo-oppsett klart");
console.log("========================================");
console.log(`Passord (alle):  ${PASSWORD}\n`);
for (const r of results) {
  console.log(`  ${r.adminEmail.padEnd(30)} → org ${r.orgId}`);
}
console.log("\nLogg inn: https://app.echoo.no/login");
console.log("\nFor å vaske og re-seede: npm run seed:demo");
