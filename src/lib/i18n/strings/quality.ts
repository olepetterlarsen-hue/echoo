import type { TranslationDict } from "./types";

// Quality-mode pages: forms, deviations, competence, substances, routines, handbook.
// Add new keys here. Regulatory body (FEL/NEK templates) stays Norwegian.
export const QUALITY: TranslationDict = {
  // ---- Forms (skjemaer) ----
  form_page_title: { no: "Skjemaer", en: "Forms" },
  form_page_subtitle_all: {
    no: "Frittstående HMS-skjemaer fra alle brukere. Klikk for å se eller redigere.",
    en: "Standalone HSE forms from all users. Click to view or edit.",
  },
  form_page_subtitle_own: {
    no: "Dine frittstående HMS-skjemaer. Du ser kun dine egne.",
    en: "Your standalone HSE forms. You only see your own.",
  },
  form_card_title_all: { no: "Alle skjemaer", en: "All forms" },
  form_card_title_mine: { no: "Mine skjemaer", en: "My forms" },
  form_empty_state: {
    no: "Ingen frittstående skjemaer ennå. Klikk + Nytt skjema for å starte.",
    en: "No standalone forms yet. Click + New form to get started.",
  },
  form_status_signed: { no: "Signert", en: "Signed" },
  form_status_draft: { no: "Utkast", en: "Draft" },
  form_new_button: { no: "Nytt skjema", en: "New form" },
  form_section_builtin: { no: "Standardskjemaer", en: "Standard forms" },
  form_section_custom: { no: "Egendefinerte", en: "Custom" },
  form_back_to_project: { no: "Tilbake til prosjekt", en: "Back to project" },
  form_back_to_forms: { no: "Tilbake til skjemaer", en: "Back to forms" },
  form_err_not_standalone: {
    no: "Denne dokumenttypen krever et prosjekt og kan ikke startes som frittstående skjema.",
    en: "This document type requires a project and cannot be started as a standalone form.",
  },
  form_err_custom_needs_template: {
    no: "Custom-dokument må peke på en egendefinert mal.",
    en: "Custom document must reference a custom template.",
  },
  form_err_not_logged_in: { no: "Ikke logget inn.", en: "Not signed in." },

  // ---- Deviations (avvik) ----
  dev_page_title: { no: "Avvik", en: "Deviations" },
  dev_page_subtitle: {
    no: "Alle avvik på tvers av prosjekter.",
    en: "All deviations across projects.",
  },
  dev_filter_open: { no: "Åpne", en: "Open" },
  dev_filter_fully_open: { no: "Helt åpne", en: "Fully open" },
  dev_filter_in_progress: { no: "Under arbeid", en: "In progress" },
  dev_filter_closed: { no: "Lukkede", en: "Closed" },
  dev_filter_all: { no: "Alle", en: "All" },
  dev_empty_in_filter: {
    no: "Ingen avvik i dette filteret.",
    en: "No deviations in this filter.",
  },
  dev_empty_open: { no: "Ingen avvik åpne.", en: "No open deviations." },

  // ---- Competence / certificates (kompetanse) ----
  cert_page_title: { no: "Kompetansesenter", en: "Competence centre" },
  cert_subtitle_all: {
    no: "Oversikt over kursbevis og sertifikater. Du kan laste opp på vegne av enhver bruker.",
    en: "Overview of course certificates and qualifications. You can upload on behalf of any user.",
  },
  cert_subtitle_own: {
    no: "Dine kursbevis og sertifikater. Bare du og overordnet ser dem.",
    en: "Your course certificates and qualifications. Only you and your superiors can see them.",
  },
  cert_no_other_users_title: {
    no: "Ingen andre brukere ennå",
    en: "No other users yet",
  },
  cert_no_other_users_body: {
    no: "For å laste opp kursbevis på vegne av andre, må du først opprette brukerne deres.",
    en: "To upload certificates on behalf of others, you must first create their users.",
  },
  cert_go_to_user_admin: {
    no: "Gå til brukeradministrasjon →",
    en: "Go to user administration →",
  },
  cert_show_for: { no: "Vis kursbevis for:", en: "Show certificates for:" },
  cert_all_users_count: { no: "Alle brukere ({n})", en: "All users ({n})" },
  cert_empty_all: {
    no: "Ingen kursbevis registrert ennå.",
    en: "No certificates registered yet.",
  },
  cert_empty_for_user: {
    no: "Denne brukeren har ingen kursbevis registrert.",
    en: "This user has no certificates registered.",
  },
  cert_upload_title: { no: "Last opp kursbevis", en: "Upload certificate" },
  cert_field_user: { no: "Bruker", en: "User" },
  cert_field_user_hint_multi: {
    no: "Velg hvem dette beviset gjelder",
    en: "Choose who this certificate applies to",
  },
  cert_field_user_hint_solo: {
    no: "Kun deg selv tilgjengelig — opprett flere brukere i Brukeradministrasjon",
    en: "Only yourself available — create more users in User administration",
  },
  cert_me_suffix: { no: " (meg)", en: " (me)" },
  cert_field_name: {
    no: "Navn på kurs / sertifikat",
    en: "Course / certificate name",
  },
  cert_field_issuer: { no: "Utsteder", en: "Issuer" },
  cert_field_issued: { no: "Utstedt", en: "Issued" },
  cert_field_expires: { no: "Utløper", en: "Expires" },
  cert_field_expires_hint: {
    no: "La være tom hvis ingen utløpsdato",
    en: "Leave blank if no expiry date",
  },
  cert_field_notes: { no: "Notater", en: "Notes" },
  cert_field_file: {
    no: "Fil (PDF eller bilde)",
    en: "File (PDF or image)",
  },
  cert_uploading: { no: "Laster opp…", en: "Uploading…" },
  cert_upload_cta: { no: "Last opp", en: "Upload" },
  cert_saved_info: { no: "Kursbevis lagret.", en: "Certificate saved." },
  cert_select_file_err: {
    no: "Velg en fil å laste opp.",
    en: "Select a file to upload.",
  },
  cert_issued_label: { no: "Utstedt:", en: "Issued:" },
  cert_expires_label: { no: "Utløper:", en: "Expires:" },
  cert_badge_expired: { no: "Utløpt", en: "Expired" },
  cert_badge_days: { no: "{n} dager", en: "{n} days" },
  cert_badge_valid: { no: "Gyldig", en: "Valid" },
  cert_confirm_delete: { no: "Slette \"{name}\"?", en: "Delete \"{name}\"?" },
  cert_err_missing_file: { no: "Mangler fil.", en: "Missing file." },
  cert_err_upload_failed: {
    no: "Opplasting feilet: {msg}",
    en: "Upload failed: {msg}",
  },

  // ---- Substances (stoffkartotek) ----
  subs_page_title: { no: "Stoffkartotek", en: "Substance register" },
  subs_page_subtitle: {
    no: "HMS-lovpålagt oversikt over kjemiske stoffer i bruk, med sikkerhetsdatablader (SDS) og GHS-fareklasser.",
    en: "Statutory HSE register of chemical substances in use, with safety data sheets (SDS) and GHS hazard classes.",
  },
  subs_new_button: { no: "Nytt stoff", en: "New substance" },
  subs_search_placeholder: {
    no: "Søk på navn, produsent, CAS-nr. eller bruksområde…",
    en: "Search by name, manufacturer, CAS number or usage area…",
  },
  subs_all_hazards: { no: "Alle fareklasser", en: "All hazard classes" },
  subs_filter_button: { no: "Filtrer", en: "Filter" },
  subs_empty_no_match: { no: "Ingen treff.", en: "No matches." },
  subs_empty_none_yet: {
    no: "Ingen stoffer registrert.",
    en: "No substances registered.",
  },
  subs_add_first: { no: "Legg til det første", en: "Add the first one" },
  subs_col_name: { no: "Navn", en: "Name" },
  subs_col_manufacturer: { no: "Produsent", en: "Manufacturer" },
  subs_col_usage: { no: "Bruksområde", en: "Usage area" },
  subs_col_hazards: { no: "Fareklasser", en: "Hazard classes" },
  subs_col_sds: { no: "SDS", en: "SDS" },
  subs_sds_missing: { no: "Mangler", en: "Missing" },

  // Substance form
  subs_form_create_title: { no: "Legg til stoff", en: "Add substance" },
  subs_form_create_subtitle: {
    no: "Registrer et nytt stoff i stoffkartoteket med GHS-fareklasser og SDS.",
    en: "Register a new substance in the register with GHS hazard classes and SDS.",
  },
  subs_form_edit_title: { no: "Rediger stoff", en: "Edit substance" },
  subs_section_substance: { no: "Stoff", en: "Substance" },
  subs_field_trade_name: { no: "Handelsnavn", en: "Trade name" },
  subs_field_manufacturer: {
    no: "Produsent / leverandør",
    en: "Manufacturer / supplier",
  },
  subs_field_cas: { no: "CAS-nummer", en: "CAS number" },
  subs_field_cas_hint: {
    no: "Kjemisk identifikator",
    en: "Chemical identifier",
  },
  subs_field_usage: { no: "Bruksområde", en: "Usage area" },
  subs_field_usage_placeholder: {
    no: "F.eks. Verksted, På bil, Renhold",
    en: "E.g. Workshop, On vehicle, Cleaning",
  },
  subs_field_storage: { no: "Lagringssted", en: "Storage location" },
  subs_field_storage_placeholder: {
    no: "F.eks. Brannskap A, kjellerlager",
    en: "E.g. Fire cabinet A, basement storage",
  },
  subs_field_quantity: { no: "Antatt mengde", en: "Estimated quantity" },
  subs_field_quantity_hint: {
    no: "Hvor mye lagres totalt",
    en: "How much is stored in total",
  },
  subs_field_quantity_placeholder: {
    no: "F.eks. 5 liter, 2 spraybokser",
    en: "E.g. 5 litres, 2 spray cans",
  },
  subs_field_sds_revision: {
    no: "SDS revisjonsdato",
    en: "SDS revision date",
  },
  subs_field_sds_revision_hint: {
    no: "Dato på produsentens SDS",
    en: "Date on the manufacturer's SDS",
  },
  subs_section_ghs: { no: "GHS-fareklasser", en: "GHS hazard classes" },
  subs_ghs_help: {
    no: "Velg alle fareklassene som gjelder. Pikografiene følger med på etiketten/sikkerhetsdatabladet.",
    en: "Select every hazard class that applies. The pictograms accompany the label / safety data sheet.",
  },
  subs_section_hazards: {
    no: "Fare- og vernetiltak",
    en: "Hazards and protective measures",
  },
  subs_field_h_statements: {
    no: "Fareutsagn (H-statements)",
    en: "Hazard statements (H-statements)",
  },
  subs_field_h_statements_hint: {
    no: "Fra avsnitt 2.2 i SDS, f.eks. H225, H319",
    en: "From section 2.2 of the SDS, e.g. H225, H319",
  },
  subs_field_h_statements_placeholder: {
    no: "F.eks. H225 Meget brannfarlig væske og damp, H319 Gir alvorlig øyeirritasjon",
    en: "E.g. H225 Highly flammable liquid and vapour, H319 Causes serious eye irritation",
  },
  subs_field_p_statements: {
    no: "Vernetiltak (P-statements + tilleggsinfo)",
    en: "Protective measures (P-statements + extra info)",
  },
  subs_field_p_statements_hint: {
    no: "Verneutstyr, ventilasjon, lagringskrav",
    en: "PPE, ventilation, storage requirements",
  },
  subs_field_p_statements_placeholder: {
    no: "F.eks. Bruk vernebriller, hansker. God ventilasjon. Holdes unna åpen ild.",
    en: "E.g. Use safety goggles, gloves. Good ventilation. Keep away from open flame.",
  },
  subs_section_sds: {
    no: "Sikkerhetsdatablad (SDS)",
    en: "Safety data sheet (SDS)",
  },
  subs_sds_uploaded: { no: "SDS lastet opp", en: "SDS uploaded" },
  subs_sds_open: { no: "Åpne", en: "Open" },
  subs_sds_uploading: { no: "Laster opp…", en: "Uploading…" },
  subs_sds_pdf_hint: {
    no: "PDF-fil fra produsenten. Vil lagres privat — kun aktive brukere kan åpne den.",
    en: "PDF from the manufacturer. Stored privately — only active users can open it.",
  },
  subs_section_notes: { no: "Notater", en: "Notes" },
  subs_field_internal_notes: { no: "Interne notater", en: "Internal notes" },
  subs_active_label: { no: "Stoff er aktivt", en: "Substance is active" },
  subs_inactive_hint: {
    no: "Inaktive stoffer skjules som standard fra oversikten.",
    en: "Inactive substances are hidden from the overview by default.",
  },
  subs_delete_button: { no: "Slett stoff", en: "Delete substance" },
  subs_saving: { no: "Lagrer…", en: "Saving…" },
  subs_create_submit: { no: "Legg til stoff", en: "Add substance" },
  subs_edit_submit: { no: "Lagre endringer", en: "Save changes" },
  subs_confirm_remove_sds: {
    no: "Fjerne SDS-filen?",
    en: "Remove the SDS file?",
  },
  subs_confirm_delete: {
    no: "Slette \"{name}\" fra stoffkartoteket? Dette kan ikke angres.",
    en: "Delete \"{name}\" from the register? This cannot be undone.",
  },
  subs_err_upload: {
    no: "Kunne ikke laste opp: {msg}",
    en: "Could not upload: {msg}",
  },
  subs_err_name_required: { no: "Navn er påkrevd.", en: "Name is required." },

  // Detail page
  subs_detail_inactive: { no: "Inaktiv", en: "Inactive" },
  subs_detail_back: { no: "← Stoffkartotek", en: "← Substance register" },
  subs_detail_hazards_title: { no: "Fareklasser", en: "Hazard classes" },
  subs_detail_no_hazards: {
    no: "Ingen fareklasser registrert.",
    en: "No hazard classes registered.",
  },
  subs_detail_use_storage: { no: "Bruk og lagring", en: "Use and storage" },
  subs_detail_usage_label: { no: "Bruksområde:", en: "Usage area:" },
  subs_detail_storage_label: { no: "Lagringssted:", en: "Storage location:" },
  subs_detail_quantity_label: { no: "Antatt mengde:", en: "Estimated quantity:" },
  subs_detail_sds_uploaded: {
    no: "Sikkerhetsdatablad lastet opp",
    en: "Safety data sheet uploaded",
  },
  subs_detail_revision_label: { no: "Revisjonsdato:", en: "Revision date:" },
  subs_detail_sds_missing: {
    no: "⚠ SDS er ikke lastet opp. Last ned fra produsent og legg ved.",
    en: "⚠ No SDS uploaded. Download from the manufacturer and attach.",
  },
  subs_detail_h_statements_title: { no: "Fareutsagn", en: "Hazard statements" },
  subs_detail_p_statements_title: {
    no: "Vernetiltak",
    en: "Protective measures",
  },
  subs_detail_notes_title: { no: "Interne notater", en: "Internal notes" },

  // SDS button
  subs_sds_button_open: { no: "Åpne SDS", en: "Open SDS" },
  subs_sds_button_opening: { no: "Åpner…", en: "Opening…" },
  subs_sds_button_err: {
    no: "Kunne ikke åpne SDS: {msg}",
    en: "Could not open SDS: {msg}",
  },
  subs_sds_unknown_err: { no: "ukjent feil", en: "unknown error" },

  // ---- Routines (rutiner) ----
  routine_page_title: {
    no: "Rutiner og prosedyrer",
    en: "Routines and procedures",
  },
  routine_subtitle_base: {
    no: "Bedriftens elektrosikkerhetsrutiner. Tilgjengelig for alle ansatte.",
    en: "Your company's electrical safety routines. Available to all employees.",
  },
  routine_subtitle_admin_suffix: {
    no: " Som admin kan du laste opp nye versjoner.",
    en: " As admin you can upload new versions.",
  },
  routine_search_placeholder: { no: "Søk i rutiner…", en: "Search routines…" },
  routine_all_categories: { no: "Alle kategorier", en: "All categories" },
  routine_empty: {
    no: "Ingen rutiner matcher søket.",
    en: "No routines match your search.",
  },
  routine_only_lang_norwegian: { no: "norsk", en: "Norwegian" },
  routine_only_lang_english: { no: "engelsk", en: "English" },
  routine_only_lang_available: {
    no: "Bare {lang} versjon tilgjengelig",
    en: "Only {lang} version available",
  },
  routine_not_uploaded: { no: "Ikke lastet opp ennå", en: "Not uploaded yet" },
  routine_download: { no: "Last ned", en: "Download" },
  routine_upload_no_title: {
    no: "Last opp norsk versjon",
    en: "Upload Norwegian version",
  },
  routine_upload_en_title: {
    no: "Last opp engelsk versjon",
    en: "Upload English version",
  },
  routine_err_only_admin: {
    no: "Bare administrator kan laste opp rutiner.",
    en: "Only administrators can upload routines.",
  },
  routine_err_missing_id: { no: "Mangler rutine-ID.", en: "Missing routine ID." },
  routine_err_invalid_language: {
    no: "Ugyldig språk.",
    en: "Invalid language.",
  },
  routine_err_upload_failed: {
    no: "Opplasting feilet: {msg}",
    en: "Upload failed: {msg}",
  },
  routine_err_missing_file: { no: "Mangler fil.", en: "Missing file." },

  // ---- Handbook (handbok) ----
  hb_lang_toggle_to_en: { no: "English", en: "Norsk" },
};
