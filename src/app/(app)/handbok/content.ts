export type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "list"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "note"; text: string };

export interface Chapter {
  title: string;
  blocks: Block[];
}

export interface HandbookContent {
  title: string;
  subtitle: string;
  tocTitle: string;
  chapters: Chapter[];
}

export const HANDBOOK_NO: HandbookContent = {
  title: "Håndbok",
  subtitle: "Echoo — komplett bruksanvisning",
  tocTitle: "Innhold",
  chapters: [
    {
      title: "Introduksjon",
      blocks: [
        {
          type: "p",
          text: "Velkommen til Echoo — kvalitetssystem for elektrodokumentasjon. Systemet er bygget for å gi standardisert, sporbar og forskriftsmessig dokumentasjon for alle elektroprosjekter — Risikovurdering, Sluttkontroll, Samsvarserklæring, samt forenklet sikkerhetsdokumentasjon for serviceoppdrag med lav risiko.",
        },
        {
          type: "p",
          text: "All dokumentasjon følger De 5 Sikre, NEK 400, FEL og FSE. Hvert dokument signeres digitalt, eksporteres som PDF og lagres knyttet til prosjektkortet. Ved endringer opprettes en ny versjon.",
        },
        {
          type: "note",
          text: "Systemet erstatter ikke ditt faglige skjønn. Det sikrer at riktig dokumentasjon blir produsert og bevart.",
        },
      ],
    },
    {
      title: "Velg riktig dokumentasjonsprosess",
      blocks: [
        { type: "h", text: "Standardprosess (3 dokumenter)" },
        {
          type: "p",
          text: "Brukes for normale og høyrisiko-prosjekter. Tre separate dokumenter signeres og oppbevares: Risikovurdering, Sluttkontroll og Samsvarserklæring.",
        },
        { type: "h", text: "Forenklet sikkerhet (1 dokument)" },
        {
          type: "p",
          text: "Brukes kun for enkle serviceoppdrag med lav risiko. Alle sjekkpunkter i gruppen «Risikovurdering (Forutsetninger – lav risiko)» må kunne besvares JA. Hvis ikke: bruk standardprosessen.",
        },
        { type: "h", text: "Når forenklet IKKE kan brukes" },
        {
          type: "list",
          items: [
            "Installasjoner som omfattes av NEK 400 del 7",
            "Arbeid på batteri, likeretter, UPS",
            "Diesel- eller bensinaggregat",
            "Nyanlegg (kun utvidelse og endring)",
            "Når ytre påvirkninger ikke er normale (Nek 400 tabell 51A)",
          ],
        },
        {
          type: "note",
          text: "Det er en forutsetning at utførende kommuniserer med eier/bruker før forenklet dokumentasjon benyttes.",
        },
      ],
    },
    {
      title: "Roller og tilgang",
      blocks: [
        { type: "h", text: "Administrator" },
        { type: "p", text: "Oppretter, redigerer og deaktiverer brukere. Har full tilgang til alle prosjekter og kan se kompetanseregister for alle ansatte." },
        { type: "h", text: "Prosjektleder" },
        { type: "p", text: "Oppretter og styrer prosjekter. Kan godkjenne, signere og opprette nye versjoner av dokumenter. Tildeler avvik." },
        { type: "h", text: "Elektriker" },
        { type: "p", text: "Utfører kontrollarbeid, fyller ut og signerer dokumenter, registrerer avvik på prosjekter hen er involvert i." },
      ],
    },
    {
      title: "De 5 Sikre",
      blocks: [
        { type: "p", text: "Standardprosedyre for sikkert arbeid på frakoblet elektrisk anlegg (NEK EN 50110-1). Alle 5 punkter skal være gjennomført før arbeid starter:" },
        {
          type: "ol",
          items: [
            "Frakoble — alle ledere skal være koblet fra spenningskilde.",
            "Sikre mot innkobling — lås av bryter, sett varselskilt.",
            "Kontroller spenningsløs tilstand — bruk godkjent spenningstester.",
            "Jord og kortslutt — der det er krav.",
            "Avskjerm spenningssatte deler — der disse ikke kan frakobles.",
          ],
        },
        { type: "note", text: "Disse 5 punktene er obligatoriske i Risikovurderingen før arbeid starter." },
      ],
    },
    {
      title: "Komme i gang — første gang",
      blocks: [
        {
          type: "ol",
          items: [
            "Logg inn med e-post og passord du fikk fra administrator.",
            "Gå til Min profil → fyll inn navn, tittel og telefon.",
            "Tegn signaturen din i signatur-feltet. Den lagres på din profil og brukes automatisk når du signerer dokumenter.",
            "Last opp kursbevis i Kompetansesenter dersom du har det.",
          ],
        },
        { type: "note", text: "Du må ha tegnet signatur før du kan signere et dokument. Du kan oppdatere signaturen når som helst." },
      ],
    },
    {
      title: "Opprette og arbeide med prosjekter",
      blocks: [
        { type: "h", text: "Nytt prosjekt" },
        {
          type: "ol",
          items: [
            "Gå til Prosjekter → Nytt prosjekt.",
            "Fyll inn prosjektnummer (unikt), tittel, kunde og anleggsadresse.",
            "Klikk Opprett. Du blir tatt til prosjektkortet.",
          ],
        },
        { type: "h", text: "Status" },
        {
          type: "p",
          text: "Status kan endres direkte fra prosjektkortet: Aktiv → På vent → Ferdigstilt → Arkivert. Når status settes til Ferdigstilt registreres dato automatisk.",
        },
      ],
    },
    {
      title: "Dokumenter — utfylling, signering og versjonering",
      blocks: [
        { type: "h", text: "Utfylling" },
        {
          type: "ol",
          items: [
            "På prosjektkortet, klikk Opprett under ønsket dokumenttype.",
            "Skjemafelter er forhåndsutfylt med prosjektinfo der mulig.",
            "Lagre utkast underveis — du kan komme tilbake når som helst.",
          ],
        },
        { type: "h", text: "Signering" },
        {
          type: "p",
          text: "Klikk Signer og generer PDF. Dokumentet låses, PDF genereres med din signatur og lagres på prosjektkortet. Signerte dokumenter kan ikke endres direkte.",
        },
        { type: "h", text: "Ny versjon" },
        {
          type: "p",
          text: "Hvis endringer må gjøres på et signert dokument, klikk Ny versjon. En kopi opprettes som v2, v3 osv. Den nye versjonen må signeres på nytt før den blir gyldig. Forrige versjon beholdes for sporbarhet.",
        },
        { type: "note", text: "Alle versjoner er tilgjengelige som PDF i Versjonshistorikk." },
      ],
    },
    {
      title: "Avvik",
      blocks: [
        {
          type: "p",
          text: "Avvik registreres direkte på prosjektkortet. Klikk Registrer avvik, fyll inn tittel, beskrivelse, alvorlighet og tildel ansvarlig.",
        },
        { type: "h", text: "Statusflyt" },
        {
          type: "list",
          items: [
            "Åpen — nyregistrert, ingen tiltak iverksatt.",
            "Under arbeid — tiltak pågår.",
            "Lukket — beskriv tiltak før lukking. Resolutionsfeltet er påkrevd.",
          ],
        },
        { type: "p", text: "Alle åpne avvik finnes også i global Avvik-oversikt med filtrering." },
      ],
    },
    {
      title: "Kompetansesenter",
      blocks: [
        {
          type: "p",
          text: "Last opp kursbevis, sertifikater og dokumentasjon på kompetanse. Du kan registrere utstedelses- og utløpsdato slik at systemet varsler når noe nærmer seg utløp.",
        },
        { type: "p", text: "Administrator ser alle ansattes kompetanse. Vanlige brukere ser kun sin egen." },
      ],
    },
    {
      title: "Eksport av PDF",
      blocks: [
        {
          type: "p",
          text: "Fra hvert prosjektkort kan du laste ned signert PDF for hver dokumenttype, samt eldre versjoner via Versjonshistorikk. PDF inneholder all skjemainformasjon, signatur, dato og versjon. Filnavn følger formatet: {prosjektnr}-{dokumenttype}-v{n}.pdf.",
        },
      ],
    },
    {
      title: "Personvern og lagring",
      blocks: [
        { type: "p", text: "All data lagres i Supabase med radnivå-sikkerhet (RLS). Filer ligger i private buckets — kun innloggede brukere med rett rolle har tilgang. Signaturer lagres som bilder i din profil og fryses i hver signerte dokumentversjon for sporbarhet." },
      ],
    },
  ],
};

export const HANDBOOK_EN: HandbookContent = {
  title: "Handbook",
  subtitle: "Echoo — complete user guide",
  tocTitle: "Contents",
  chapters: [
    {
      title: "Introduction",
      blocks: [
        {
          type: "p",
          text: "Welcome to Echoo — a quality system for electrical documentation. The system provides standardised, traceable and code-compliant documentation for every project — Risk Assessment, Final Inspection, Declaration of Conformity, plus simplified safety documentation for low-risk service jobs.",
        },
        {
          type: "p",
          text: "All documentation follows The 5 Safety Steps, NEK 400, the Norwegian Low-Voltage Regulations (FEL) and FSE. Every document is digitally signed, exported as PDF, and stored alongside the project record. Edits create a new version.",
        },
        {
          type: "note",
          text: "The system does not replace your professional judgement. It ensures the right documentation is produced and preserved.",
        },
      ],
    },
    {
      title: "Choosing the right documentation process",
      blocks: [
        { type: "h", text: "Standard process (3 documents)" },
        {
          type: "p",
          text: "Used for normal and high-risk projects. Three separate documents are signed and stored: Risk Assessment, Final Inspection and Declaration of Conformity.",
        },
        { type: "h", text: "Simplified safety (1 document)" },
        {
          type: "p",
          text: "Used only for simple service jobs with low risk. Every checkpoint in the «Risk assessment (Prerequisites – low risk)» group must be answered YES. Otherwise, use the standard process.",
        },
        { type: "h", text: "When simplified MUST NOT be used" },
        {
          type: "list",
          items: [
            "Installations covered by NEK 400 part 7",
            "Work on batteries, rectifiers, UPS",
            "Diesel or petrol generators",
            "New installations (only expansion and changes)",
            "When external influences are not normal (NEK 400 table 51A)",
          ],
        },
        {
          type: "note",
          text: "Communication with the owner/user is a prerequisite for using simplified documentation.",
        },
      ],
    },
    {
      title: "Roles and access",
      blocks: [
        { type: "h", text: "Administrator" },
        { type: "p", text: "Creates, edits, and deactivates users. Full access to all projects and visibility into competence records for all employees." },
        { type: "h", text: "Project manager" },
        { type: "p", text: "Creates and manages projects. Can approve, sign, and create new versions of documents. Assigns deviations." },
        { type: "h", text: "Electrician" },
        { type: "p", text: "Carries out inspection work, completes and signs documents, registers deviations on projects they are involved in." },
      ],
    },
    {
      title: "The 5 Safety Steps",
      blocks: [
        { type: "p", text: "Standard procedure for safe work on de-energised electrical installations (NEK EN 50110-1). All five steps must be completed before work begins:" },
        {
          type: "ol",
          items: [
            "Disconnect — all conductors must be disconnected from the supply.",
            "Secure against reconnection — lock out switches and post warning signs.",
            "Verify voltage-free condition — use an approved voltage tester.",
            "Earth and short-circuit — where required.",
            "Shield live parts — that cannot be disconnected.",
          ],
        },
        { type: "note", text: "These 5 steps are mandatory in the Risk Assessment before work starts." },
      ],
    },
    {
      title: "Getting started — first time",
      blocks: [
        {
          type: "ol",
          items: [
            "Sign in with the email and password you received from your administrator.",
            "Go to My Profile → fill in your name, title, and phone number.",
            "Draw your signature in the signature field. It is saved to your profile and applied automatically when you sign documents.",
            "Upload your certificates in the Competence centre if you have them.",
          ],
        },
        { type: "note", text: "You must have drawn a signature before you can sign a document. You can update your signature at any time." },
      ],
    },
    {
      title: "Creating and working with projects",
      blocks: [
        { type: "h", text: "New project" },
        {
          type: "ol",
          items: [
            "Go to Projects → New project.",
            "Fill in project number (unique), title, customer and site address.",
            "Click Create. You will be taken to the project record.",
          ],
        },
        { type: "h", text: "Status" },
        {
          type: "p",
          text: "Status can be changed directly from the project record: Active → On hold → Completed → Archived. When set to Completed the date is recorded automatically.",
        },
      ],
    },
    {
      title: "Documents — completion, signing and versioning",
      blocks: [
        { type: "h", text: "Completion" },
        {
          type: "ol",
          items: [
            "On the project record, click Create under the desired document type.",
            "Form fields are pre-filled with project information where possible.",
            "Save as draft along the way — you can return at any time.",
          ],
        },
        { type: "h", text: "Signing" },
        {
          type: "p",
          text: "Click Sign and generate PDF. The document is locked, a PDF is generated with your signature, and saved to the project record. Signed documents cannot be edited directly.",
        },
        { type: "h", text: "New version" },
        {
          type: "p",
          text: "If changes are needed on a signed document, click New version. A copy is created as v2, v3 etc. The new version must be re-signed before it is valid. The previous version is preserved for traceability.",
        },
        { type: "note", text: "All versions are available as PDFs under Version history." },
      ],
    },
    {
      title: "Deviations",
      blocks: [
        {
          type: "p",
          text: "Deviations are recorded directly on the project record. Click Register deviation, fill in title, description, severity and assign a responsible person.",
        },
        { type: "h", text: "Status flow" },
        {
          type: "list",
          items: [
            "Open — newly registered, no action taken yet.",
            "In progress — corrective action under way.",
            "Closed — describe the corrective action before closing. The resolution field is required.",
          ],
        },
        { type: "p", text: "All open deviations are also available in the global Deviations overview with filtering." },
      ],
    },
    {
      title: "Competence centre",
      blocks: [
        {
          type: "p",
          text: "Upload certificates, course completions, and competence documentation. You can record issue and expiry dates so the system can flag upcoming renewals.",
        },
        { type: "p", text: "Administrators can see competence records for all employees. Regular users see only their own." },
      ],
    },
    {
      title: "PDF export",
      blocks: [
        {
          type: "p",
          text: "From each project record you can download a signed PDF of each document type, along with older versions via Version history. PDFs include all form data, signature, date and version. The filename follows the pattern: {project-no}-{document-type}-v{n}.pdf.",
        },
      ],
    },
    {
      title: "Privacy and storage",
      blocks: [
        { type: "p", text: "All data is stored in Supabase with row-level security (RLS). Files are kept in private buckets — only signed-in users with the correct role can access them. Signatures are stored as images on your profile and frozen into each signed document version for traceability." },
      ],
    },
  ],
};
