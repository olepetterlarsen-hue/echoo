import type { TranslationDict } from "./types";

// Project pages: /prosjekter, /prosjekter/ny, /prosjekter/[id]/*, /prosjekter/[id]/dokumenter/[kind].
// Regulatory body of document templates (FEL §, NEK 400, ROT741 etc.) stays Norwegian.
export const PROJECTS: TranslationDict = {
  // ── Projects list (/prosjekter) ─────────────────────────────────────────
  proj_title: { no: "Prosjekter", en: "Projects" },
  proj_subtitle: {
    no: "Alle elektroprosjekter under oppfølging.",
    en: "All electrical projects under follow-up.",
  },
  proj_new: { no: "Nytt prosjekt", en: "New project" },
  proj_search_placeholder: {
    no: "Søk på nummer, tittel eller kunde…",
    en: "Search by number, title or customer…",
  },
  proj_all_statuses: { no: "Alle statuser", en: "All statuses" },
  proj_all_phases: { no: "Alle faser", en: "All phases" },
  proj_filter: { no: "Filtrer", en: "Filter" },
  proj_status_aktiv: { no: "Aktiv", en: "Active" },
  proj_status_paa_vent: { no: "På vent", en: "On hold" },
  proj_status_ferdigstilt: { no: "Ferdigstilt", en: "Completed" },
  proj_status_arkivert: { no: "Arkivert", en: "Archived" },
  proj_col_number: { no: "Nummer", en: "Number" },
  proj_col_title: { no: "Tittel", en: "Title" },
  proj_col_customer: { no: "Kunde", en: "Customer" },
  proj_col_phase: { no: "Fase", en: "Phase" },
  proj_col_status: { no: "Status", en: "Status" },
  proj_col_updated: { no: "Oppdatert", en: "Updated" },
  proj_empty: { no: "Ingen prosjekter.", en: "No projects." },
  proj_create_one: { no: "Opprett ett", en: "Create one" },

  // ── New project page (/prosjekter/ny) ───────────────────────────────────
  proj_new_subtitle: {
    no: "Opprett prosjektkort. Dokumenter opprettes etterpå.",
    en: "Create the project card. Documents are created afterwards.",
  },
  proj_new_template_heading: {
    no: "Start fra mal (valgfritt)",
    en: "Start from template (optional)",
  },
  proj_new_template_help: {
    no: "Velg en mal for å forhåndsutfylle felter. Du kan fortsatt endre alt før du oppretter.",
    en: "Pick a template to prefill fields. You can still change everything before creating.",
  },
  proj_new_using_template: { no: "Bruker malen:", en: "Using template:" },
  proj_new_clear_template: { no: "Tøm", en: "Clear" },
  proj_new_section_info: { no: "Prosjektinformasjon", en: "Project information" },
  proj_new_order_number: { no: "Ordrenummer", en: "Order number" },
  proj_new_order_number_hint: {
    no: "Internt referansenummer",
    en: "Internal reference number",
  },
  proj_new_title_label: { no: "Tittel", en: "Title" },
  proj_new_installation_type: { no: "Type anlegg", en: "Installation type" },
  proj_new_installation_type_hint: {
    no: "Bestemmer Samsvarserklæring-mal og SJA-variant",
    en: "Determines Samsvarserklæring template and SJA variant",
  },
  proj_new_stage: { no: "Stage", en: "Stage" },
  proj_new_stage_hint: { no: "Kanban-kolonne ved oppstart", en: "Kanban column at start" },
  proj_new_none: { no: "— Ingen —", en: "— None —" },
  proj_new_description: { no: "Beskrivelse", en: "Description" },
  proj_new_section_customer_site: { no: "Kunde og site", en: "Customer and site" },
  proj_new_existing_customer: { no: "Eksisterende kunde", en: "Existing customer" },
  proj_new_existing_site: { no: "Eksisterende site", en: "Existing site" },
  proj_new_none_or_create: {
    no: "— Ingen / opprett ny —",
    en: "— None / create new —",
  },
  proj_new_tip_prefix: { no: "Tips: opprett kunde først i", en: "Tip: create the customer first in" },
  proj_new_tip_and: { no: "og site i", en: "and the site in" },
  proj_new_tip_suffix: {
    no: "— så slipper du å fylle inn det samme på hvert prosjekt.",
    en: "— that way you avoid filling in the same data on every project.",
  },
  proj_new_link_customers: { no: "Kunder", en: "Customers" },
  proj_new_link_sites: { no: "Sites", en: "Sites" },
  proj_new_legacy_fields: {
    no: "Eldre felter — kunde- og anleggsdata direkte på prosjektet (valgfritt)",
    en: "Legacy fields — customer and site data directly on the project (optional)",
  },
  proj_new_customer_freetext: {
    no: "Oppdragsgiver (kunde) — fritekst",
    en: "Client (customer) — free text",
  },
  proj_new_field_company_name: { no: "Firma/Navn", en: "Company/Name" },
  proj_new_field_contact_person: { no: "Kontaktperson", en: "Contact person" },
  proj_new_field_phone: { no: "Telefon", en: "Phone" },
  proj_new_field_email: { no: "E-post", en: "Email" },
  proj_new_site_address: { no: "Anleggsadresse — fritekst", en: "Site address — free text" },
  proj_new_field_street: { no: "Gateadresse", en: "Street address" },
  proj_new_field_postal: { no: "Postnr.", en: "Postal code" },
  proj_new_field_city: { no: "Sted", en: "City" },
  proj_new_cancel: { no: "Avbryt", en: "Cancel" },
  proj_new_create: { no: "Opprett prosjekt", en: "Create project" },
  proj_new_creating: { no: "Oppretter…", en: "Creating…" },

  // ── Server action errors (shared) ───────────────────────────────────────
  proj_err_not_signed_in: { no: "Ikke logget inn.", en: "Not signed in." },
  proj_err_not_found: { no: "Prosjektet ble ikke funnet.", en: "Project not found." },

  // ── Add to map ──────────────────────────────────────────────────────────
  proj_add_to_map: { no: "Legg til på kart", en: "Add to map" },
  proj_add_to_map_busy: { no: "Geokoder…", en: "Geocoding…" },
  proj_add_to_map_done: { no: "✓ Lagt til på kartet", en: "✓ Added to map" },
  proj_add_to_map_already: { no: "Allerede på kart", en: "Already on map" },
  proj_map_no_address: {
    no: "Mangler adresse å geokode.",
    en: "Missing address to geocode.",
  },
  proj_map_geocode_failed: {
    no: "Fant ikke koordinater for adressen.",
    en: "Could not find coordinates for the address.",
  },

  // ── Project detail page (/prosjekter/[id]) ──────────────────────────────
  proj_back_to_list: { no: "← Prosjekter", en: "← Projects" },
  proj_edit: { no: "Rediger", en: "Edit" },
  proj_tab_planning: { no: "Planlegging", en: "Planning" },
  proj_tab_quality: { no: "Kvalitet", en: "Quality" },

  // Planning tab cards
  proj_card_customer: { no: "Kunde", en: "Customer" },
  proj_card_site: { no: "Anlegg", en: "Site" },
  proj_card_status: { no: "Status", en: "Status" },
  proj_card_description: { no: "Beskrivelse", en: "Description" },
  proj_not_linked_customer: {
    no: "Ikke knyttet til kundekartet.",
    en: "Not linked to the customer registry.",
  },
  proj_not_linked_site: {
    no: "Ikke knyttet til site-registeret.",
    en: "Not linked to the site registry.",
  },
  proj_link_up: { no: "Koble til", en: "Link up" },
  proj_show_on_map: { no: "Vis på kart", en: "Show on map" },
  proj_kanban_phase: { no: "Kanban-fase:", en: "Kanban phase:" },
  proj_installation_type_label: { no: "Type anlegg:", en: "Installation type:" },
  proj_updated: { no: "Oppdatert", en: "Updated" },

  // Production plan section
  proj_production_plan: { no: "Produksjonsplan", en: "Production plan" },
  proj_not_planned: { no: "Ikke planlagt", en: "Not planned" },
  proj_n_assignments: { no: "{n} oppdrag", en: "{n} assignments" },
  proj_place_in_plan: { no: "Plasser i plan", en: "Place in plan" },
  proj_production_plan_empty_prefix: {
    no: "Prosjektet er ikke plassert i produksjonsplanen ennå.",
    en: "The project has not been placed in the production plan yet.",
  },
  proj_place_it_now: { no: "Plasser det nå", en: "Place it now" },
  proj_schedule_done: { no: "Ferdig", en: "Done" },
  proj_schedule_in_progress: { no: "Pågår", en: "In progress" },
  proj_schedule_revisit: { no: "Revurder", en: "Revisit" },
  proj_schedule_planned: { no: "Planlagt", en: "Planned" },
  proj_view_in_gantt: { no: "Vis i Gantt →", en: "View in Gantt →" },

  // Tasks section
  proj_tasks: { no: "Oppgaver", en: "Tasks" },
  proj_n_open: { no: "{n} åpne", en: "{n} open" },
  proj_new_task: { no: "Ny oppgave", en: "New task" },
  proj_tasks_empty_prefix: {
    no: "Ingen oppgaver enda.",
    en: "No tasks yet.",
  },
  proj_create_first_task: { no: "Opprett den første", en: "Create the first one" },
  proj_no_assignee: { no: "Ingen tildelt", en: "Nobody assigned" },
  proj_task_due_prefix: { no: "frist", en: "due" },
  proj_see_all_n_tasks: { no: "Se alle {n} oppgaver →", en: "See all {n} tasks →" },

  // Deviations summary
  proj_deviations: { no: "Avvik", en: "Deviations" },
  proj_see_under_quality: { no: "Se under Kvalitet →", en: "See under Quality →" },
  proj_deviations_help_prefix: {
    no: "Full håndtering av avvik (registrer, tildel, lukk) er under",
    en: "Full deviation handling (register, assign, close) is under",
  },
  proj_quality_tab_link: { no: "Kvalitet-fanen", en: "the Quality tab" },

  // Comments
  proj_communication: { no: "Kommunikasjon", en: "Communication" },
  proj_comment_placeholder: {
    no: "Skriv en kommentar til prosjektet…",
    en: "Write a comment on the project…",
  },
  proj_comment_help: {
    no: "Synlig for alle aktive brukere. Maks 4000 tegn.",
    en: "Visible to all active users. Max 4000 characters.",
  },
  proj_comment_send: { no: "Send", en: "Send" },
  proj_comment_sending: { no: "Sender…", en: "Sending…" },
  proj_comment_empty: {
    no: "Ingen kommentarer ennå. Start diskusjonen.",
    en: "No comments yet. Start the discussion.",
  },
  proj_comment_unknown_author: { no: "Ukjent", en: "Unknown" },
  proj_comment_delete_title: { no: "Slett kommentar", en: "Delete comment" },
  proj_comment_confirm_delete: { no: "Slette kommentaren?", en: "Delete the comment?" },
  proj_comment_delete_failed: { no: "Kunne ikke slette:", en: "Could not delete:" },
  proj_comment_just_now: { no: "akkurat nå", en: "just now" },
  proj_comment_min_ago: { no: "{n} min siden", en: "{n} min ago" },
  proj_comment_hours_ago: { no: "{n} t siden", en: "{n} h ago" },
  proj_comment_days_ago: { no: "{n} dager siden", en: "{n} days ago" },
  proj_comment_err_empty: {
    no: "Kommentaren kan ikke være tom.",
    en: "The comment cannot be empty.",
  },
  proj_comment_err_too_long: {
    no: "Kommentaren er for lang (maks 4000 tegn).",
    en: "The comment is too long (max 4000 characters).",
  },

  // ── Quality tab ─────────────────────────────────────────────────────────
  proj_section_standard: { no: "Standardprosess", en: "Standard process" },
  proj_n_documents: { no: "({n} dokumenter)", en: "({n} documents)" },
  proj_n_document: { no: "({n} dokument)", en: "({n} document)" },
  proj_standard_help: {
    no: "Komplett 5 Sikre-dokumentasjon for normale og høyrisiko-prosjekter.",
    en: "Complete 5 Sikre documentation for normal and high-risk projects.",
  },
  proj_section_simplified: { no: "Forenklet sikkerhet", en: "Simplified safety" },
  proj_simplified_help: {
    no: "For serviceoppdrag med lav risiko. Brukes som alternativ til de tre over når alle forutsetninger for lav risiko er oppfylt.",
    en: "For low-risk service assignments. Used as an alternative to the three above when all preconditions for low risk are met.",
  },
  proj_section_sja: { no: "Sikker Jobb Analyse (SJA)", en: "Safe Job Analysis (SJA)" },
  proj_sja_help: {
    no: "Detaljert risikoanalyse før utførelse. Kan opprettes flere versjoner per arbeidsoppgave.",
    en: "Detailed risk analysis before execution. Multiple versions can be created per work task.",
  },
  proj_section_hms: { no: "HMS-dokumenter", en: "HSE documents" },
  proj_section_custom: { no: "Egne maler", en: "Custom templates" },
  proj_custom_help: {
    no: "Maler du selv har bygget under /admin/maler. Trykk for å opprette et dokument basert på malen.",
    en: "Templates you built under /admin/maler. Click to create a document from a template.",
  },
  proj_hms_help: {
    no: "Helse, miljø og sikkerhet. RUH ved hendelser, oppstartssjekkliste ved skift, stikkprøvekontroll ved tilsyn.",
    en: "Health, safety and environment. RUH for incidents, startup checklist per shift, spot check during inspection.",
  },

  // Document card on project quality tab
  proj_doc_view: { no: "Vis", en: "View" },
  proj_doc_edit: { no: "Rediger", en: "Edit" },
  proj_doc_signed: { no: "Signert", en: "Signed" },
  proj_doc_draft: { no: "Utkast", en: "Draft" },
  proj_doc_create: { no: "Opprett", en: "Create" },
  proj_doc_version_history: { no: "Versjonshistorikk ({n})", en: "Version history ({n})" },

  // Document kind descriptions
  proj_kind_desc_risikovurdering: {
    no: "Identifiser farer og tiltak før arbeid. Inkluderer De 5 Sikre.",
    en: "Identify hazards and measures before work. Includes De 5 Sikre.",
  },
  proj_kind_desc_sluttkontroll: {
    no: "Visuell kontroll, målinger og funksjonsprøving etter NEK 400-6.",
    en: "Visual inspection, measurements and functional testing per NEK 400-6.",
  },
  proj_kind_desc_samsvarserklaering: {
    no: "Erklæring om at anlegget oppfyller forskrifter og normer.",
    en: "Declaration that the installation meets regulations and standards.",
  },
  proj_kind_desc_forenklet_sikkerhet: {
    no: "Kombinert dokumentasjon for serviceoppdrag med lav risiko. Erstatter de tre over når alle forutsetninger for lav risiko er oppfylt.",
    en: "Combined documentation for low-risk service assignments. Replaces the three above when all preconditions for low risk are met.",
  },
  proj_kind_desc_sja: {
    no: "Detaljert risikoanalyse før utførelse. 12 seksjoner med risikovurdering pr. punkt: securing work area, delivery, installation, hot works, removal of poles, survey, ladders, tower/poles, masts on, crane, lift, heli.",
    en: "Detailed risk analysis before execution. 12 sections with per-item risk assessment: securing work area, delivery, installation, hot works, removal of poles, survey, ladders, tower/poles, masts on, crane, lift, heli.",
  },
  proj_kind_desc_ruh: {
    no: "Rapport om Uønsket Hendelse. Bruk for å varsle ledelsen om uønskede hendelser, nestenulykker eller skader.",
    en: "Report of Undesired Incident (RUH). Use to notify management of undesired incidents, near-misses or injuries.",
  },
  proj_kind_desc_startup_checklist: {
    no: "Sjekkliste som må gjennomgås ved starten av hvert skift/rotasjon. Verifiserer bil, utstyr, klatreutstyr, PVU og HMS-kort.",
    en: "Checklist to review at the start of every shift/rotation. Verifies vehicle, equipment, climbing gear, PPE and HSE card.",
  },
  proj_kind_desc_stikkprovekontroll: {
    no: "Bedriftens kontrollskjema for å styrke HMS-arbeid og bekrefte etterlevelse. 61 sjekkpunkter fordelt på 9 seksjoner.",
    en: "The company's control form to strengthen HSE work and confirm compliance. 61 checkpoints across 9 sections.",
  },
  proj_kind_desc_internkontroll: {
    no: "Gjennomgang og verifikasjon av et signert dokument. Startes med 'Kjør internkontroll'-knappen.",
    en: "Review and verification of a signed document. Triggered by the 'Run internal control' button.",
  },
  proj_kind_desc_custom: {
    no: "Egendefinert skjema. Vises kun via /skjemaer.",
    en: "Custom form. Shown only via /skjemaer.",
  },

  // Deviations block (client component on quality tab)
  proj_dev_register: { no: "Registrer avvik", en: "Register deviation" },
  proj_dev_empty: {
    no: "Ingen registrerte avvik på dette prosjektet.",
    en: "No deviations registered on this project.",
  },
  proj_dev_severity: { no: "Alvorlighet", en: "Severity" },
  proj_dev_sev_lav: { no: "Lav", en: "Low" },
  proj_dev_sev_middels: { no: "Middels", en: "Medium" },
  proj_dev_sev_hoey: { no: "Høy", en: "High" },
  proj_dev_sev_kritisk: { no: "Kritisk", en: "Critical" },
  proj_dev_assign: { no: "Tildel", en: "Assign" },
  proj_dev_none_assignee: { no: "Ingen", en: "Nobody" },
  proj_dev_cancel: { no: "Avbryt", en: "Cancel" },
  proj_dev_register_button: { no: "Registrer", en: "Register" },
  proj_dev_saving: { no: "Lagrer…", en: "Saving…" },
  proj_dev_title_field: { no: "Tittel", en: "Title" },
  proj_dev_description_field: { no: "Beskrivelse", en: "Description" },
  proj_dev_assigned_prefix: { no: "tildelt", en: "assigned to" },
  proj_dev_action_field: { no: "Tiltak / lukking", en: "Measure / closing" },
  proj_dev_action_placeholder: {
    no: "Beskriv tiltak når avviket lukkes…",
    en: "Describe the measure when closing the deviation…",
  },
  proj_dev_set_in_progress: { no: "Sett under arbeid", en: "Mark as in progress" },
  proj_dev_close: { no: "Lukk avvik", en: "Close deviation" },
  proj_dev_reopen: { no: "Gjenåpne", en: "Reopen" },

  // Project status select
  proj_status_select_aktiv: { no: "Aktiv", en: "Active" },
  proj_status_select_paa_vent: { no: "På vent", en: "On hold" },
  proj_status_select_ferdigstilt: { no: "Ferdigstilt", en: "Completed" },
  proj_status_select_arkivert: { no: "Arkivert", en: "Archived" },

  // ── Edit project page ───────────────────────────────────────────────────
  proj_edit_title: { no: "Rediger prosjekt", en: "Edit project" },
  proj_edit_section_info: { no: "Prosjektinformasjon", en: "Project information" },
  proj_edit_installation_hint: {
    no: "Styrer Samsvarserklæring-mal",
    en: "Controls Samsvarserklæring template",
  },
  proj_edit_phase: { no: "Fase", en: "Phase" },
  proj_edit_phase_hint: {
    no: "Livssyklus-fase (Tilbud / Produksjon / Fullført / Tapt / Avlyst)",
    en: "Lifecycle phase (Bidding / Production / Completed / Lost / Cancelled)",
  },
  proj_edit_category: { no: "Kategori", en: "Category" },
  proj_edit_category_hint: {
    no: "Bestemmer hvilke ekstra felter som vises",
    en: "Determines which additional fields are shown",
  },
  proj_edit_no_category: { no: "— Ingen kategori —", en: "— No category —" },
  proj_edit_fields_for: { no: "Felter for «{name}»", en: "Fields for «{name}»" },
  proj_edit_section_customer_site: { no: "Kunde og site", en: "Customer and site" },
  proj_edit_none_or_freetext: {
    no: "— Ingen / bruk fritekst —",
    en: "— None / use free text —",
  },
  proj_edit_stage_hint: { no: "Kanban-kolonne", en: "Kanban column" },
  proj_edit_planned_start: { no: "Planlagt oppstart", en: "Planned start" },
  proj_edit_planned_end: { no: "Planlagt slutt / frist", en: "Planned end / deadline" },
  proj_edit_shown_in_calendar: { no: "Vises i kalenderen", en: "Shown in the calendar" },
  proj_edit_customer_site_help_prefix: {
    no: "Knyttede kunder og sites brukes på kart og kunde-/site-sider. Fritekst-feltene under brukes i dokumenter og PDF-er hvis de er utfylt. Mangler kunde?",
    en: "Linked customers and sites are used on the map and customer/site pages. The free-text fields below are used in documents and PDFs when filled out. Missing a customer?",
  },
  proj_edit_create_new: { no: "Opprett ny", en: "Create new" },
  proj_edit_section_client_freetext: {
    no: "Oppdragsgiver (fritekst — brukes i dokumenter)",
    en: "Client (free text — used in documents)",
  },
  proj_edit_field_address: { no: "Adresse", en: "Address" },
  proj_edit_field_org_number: { no: "Organisasjonsnummer", en: "Organisation number" },
  proj_edit_section_site_freetext: {
    no: "Anleggsadresse (fritekst — brukes i dokumenter)",
    en: "Site address (free text — used in documents)",
  },
  proj_edit_field_site_company: { no: "Firma/Navn (anlegg)", en: "Company/Name (site)" },
  proj_edit_field_house_number: { no: "Hus nr.", en: "House no." },
  proj_edit_field_house_letter: { no: "Bokstav", en: "Letter" },
  proj_edit_field_ssb_number: { no: "SSB-nr.", en: "SSB no." },
  proj_edit_save: { no: "Lagre", en: "Save" },
  proj_edit_saving: { no: "Lagrer…", en: "Saving…" },
  proj_edit_cancel: { no: "Avbryt", en: "Cancel" },

  // ── Document editor ─────────────────────────────────────────────────────
  proj_doc_back_to_project: { no: "Tilbake til prosjekt", en: "Back to project" },
  proj_doc_back_to_forms: { no: "Tilbake til skjemaer", en: "Back to forms" },
  proj_doc_standalone_label: { no: "Frittstående skjema", en: "Standalone form" },
  proj_doc_download_pdf: { no: "Last ned PDF", en: "Download PDF" },
  proj_doc_signed_banner: {
    no: "Dette dokumentet er signert v{v} av {date}. For å gjøre endringer må du opprette en ny versjon.",
    en: "This document is signed v{v} on {date}. To make changes, create a new version.",
  },
  proj_doc_signed_banner_no_date: {
    no: "Dette dokumentet er signert v{v}. For å gjøre endringer må du opprette en ny versjon.",
    en: "This document is signed v{v}. To make changes, create a new version.",
  },
  proj_doc_internal_control_title: {
    no: "Internkontroll skal utføres av en annen person",
    en: "Internal control must be performed by another person",
  },
  proj_doc_start_internal_control: { no: "Start internkontroll", en: "Start internal control" },
  proj_doc_new_version: { no: "Ny versjon", en: "New version" },
  proj_doc_saved_draft: { no: "Lagret som utkast.", en: "Saved as draft." },
  proj_doc_no_signature_error: {
    no: "Du må først tegne en signatur i Min profil før du kan signere dokumenter.",
    en: "You must first draw a signature in My profile before you can sign documents.",
  },
  proj_doc_confirm_sign: {
    no: "Signere dokumentet? Det blir låst og PDF genereres. En ny redigering vil opprette en ny versjon.",
    en: "Sign the document? It will be locked and a PDF generated. Further editing will create a new version.",
  },
  proj_doc_confirm_internal_control: {
    no: "Starte internkontroll på dette dokumentet? Et nytt internkontroll-skjema opprettes. Bør utføres av en annen person enn den som signerte originalen.",
    en: "Start internal control on this document? A new internal control form will be created. Should be performed by someone other than the original signer.",
  },
  proj_doc_confirm_new_version: {
    no: "Opprette ny versjon basert på denne? Den nye må signeres på nytt.",
    en: "Create a new version based on this one? The new version must be signed again.",
  },
  proj_doc_help_no_signature: {
    no: "Tegn signatur i Min profil for å kunne signere",
    en: "Draw a signature in My profile to be able to sign",
  },
  proj_doc_help_samsvar_blocked: {
    no: "Kun Installatør eller Bemyndiget kan signere Samsvarserklæring",
    en: "Only Installatør or Bemyndiget can sign Samsvarserklæring",
  },
  proj_doc_help_ready: {
    no: "Signatur klar — du kan signere",
    en: "Signature ready — you can sign",
  },
  proj_doc_save_draft: { no: "Lagre utkast", en: "Save draft" },
  proj_doc_saving: { no: "Lagrer…", en: "Saving…" },
  proj_doc_sign_and_generate: { no: "Signer og generer PDF", en: "Sign and generate PDF" },
  proj_doc_no_time_limit: {
    no: "Ta så lang tid du trenger — vi husker det du skriver lokalt.",
    en: "Take as long as you need — we keep what you type locally.",
  },
  proj_doc_restore_title: {
    no: "Ulagrede endringer funnet",
    en: "Unsaved changes found",
  },
  proj_doc_restore_desc: {
    no: "Vi fant tekst du skrev tidligere som ikke ble lagret. Vil du gjenopprette?",
    en: "We found text you typed earlier that wasn't saved. Restore it?",
  },
  proj_doc_participants_title: {
    no: "Deltakersignaturer",
    en: "Participant signatures",
  },
  proj_doc_participants_desc: {
    no: "Be alle på arbeidsstedet signere dette dokumentet fra sin egen bruker. Hver deltaker får en oppgave på «Mine oppgaver».",
    en: "Ask everyone on site to sign this document from their own account. Each participant gets a task in “My tasks”.",
  },
  proj_doc_participants_empty: {
    no: "Ingen deltakere er lagt til ennå.",
    en: "No participants added yet.",
  },
  proj_doc_participants_add: {
    no: "Legg til deltakere",
    en: "Add participants",
  },
  proj_doc_participants_none_left: {
    no: "Alle aktive brukere er lagt til",
    en: "All active users are added",
  },
  proj_doc_participants_pick: {
    no: "Velg hvem som skal signere",
    en: "Choose who should sign",
  },
  proj_doc_participants_send: {
    no: "Send signeringsforespørsel",
    en: "Send signing request",
  },
  proj_doc_participants_sending: { no: "Sender…", en: "Sending…" },
  proj_doc_participants_cancel: { no: "Avbryt", en: "Cancel" },
  proj_doc_participants_task_hint: {
    no: "Dokumentet lagres som utkast og deltakerne får en oppgave med lenke til dokumentet.",
    en: "The document is saved as a draft and participants get a task with a link to the document.",
  },
  proj_doc_participant_sign_self: {
    no: "Signér som deltaker",
    en: "Sign as participant",
  },
  proj_doc_participant_signed: { no: "Signert", en: "Signed" },
  proj_doc_participant_pending: {
    no: "Venter på signatur",
    en: "Awaiting signature",
  },
  proj_doc_participant_confirm_sign: {
    no: "Signere som deltaker? Signaturen din legges på dokumentet og kan ikke fjernes.",
    en: "Sign as participant? Your signature is added to the document and cannot be removed.",
  },
  proj_doc_participants_task_title: { no: "Signér:", en: "Sign:" },
  proj_doc_participants_task_desc: {
    no: "{name} ber deg signere {kind} som deltaker. Åpne dokumentet og trykk «Signér som deltaker».",
    en: "{name} asks you to sign {kind} as a participant. Open the document and tap “Sign as participant”.",
  },
  proj_doc_participants_err_kind: {
    no: "Denne dokumenttypen støtter ikke deltakersignering.",
    en: "This document type does not support participant signing.",
  },
  proj_doc_participants_err_none: {
    no: "Velg minst én deltaker.",
    en: "Select at least one participant.",
  },
  proj_doc_participants_err_not_found: {
    no: "Fant ikke deltakeren.",
    en: "Participant not found.",
  },
  proj_doc_participants_err_not_you: {
    no: "Du kan bare signere din egen deltakerrad.",
    en: "You can only sign your own participant entry.",
  },
  proj_doc_participants_err_already: {
    no: "Du har allerede signert dette dokumentet.",
    en: "You have already signed this document.",
  },
  proj_doc_participants_err_remove_signed: {
    no: "Signerte deltakere kan ikke fjernes.",
    en: "Signed participants cannot be removed.",
  },
  proj_doc_restore_yes: { no: "Gjenopprett", en: "Restore" },
  proj_doc_restore_no: { no: "Forkast", en: "Discard" },
  proj_doc_mark_all_uakt: {
    no: "Markér alle som ikke aktuelt",
    en: "Mark all as not applicable",
  },
  proj_doc_mark_all_uakt_confirm: {
    no: "Sett 'ikke aktuelt' på alle spørsmål i denne seksjonen?",
    en: "Set 'not applicable' on all questions in this section?",
  },

  // Document editor inline subforms
  proj_doc_field_question: { no: "Spørsmål", en: "Question" },
  proj_doc_field_yes: { no: "Ja", en: "Yes" },
  proj_doc_field_no: { no: "Nei", en: "No" },
  proj_doc_field_na: { no: "Uakt.", en: "N/A" },
  proj_doc_field_comment: { no: "Kommentar", en: "Comment" },
  proj_doc_select_placeholder: { no: "Velg…", en: "Select…" },
  proj_doc_checkbox_yes: { no: "Ja", en: "Yes" },
  proj_doc_scope_whole: { no: "Hele anlegget", en: "The entire installation" },
  proj_doc_scope_part: { no: "Anleggsdel", en: "Installation part" },
  proj_doc_scope_part_desc: {
    no: "Beskrivelse av anleggsdel",
    en: "Description of installation part",
  },
  proj_doc_people_empty: {
    no: "Ingen deltakere lagt til ennå.",
    en: "No participants added yet.",
  },
  proj_doc_people_name_placeholder: { no: "Navn", en: "Name" },
  proj_doc_people_role_placeholder: { no: "Rolle / firma", en: "Role / company" },
  proj_doc_remove: { no: "Fjern", en: "Remove" },
  proj_doc_add_person: { no: "Legg til person", en: "Add person" },
  proj_doc_risk_empty: { no: "Ingen rader lagt til.", en: "No rows added." },
  proj_doc_remove_row: { no: "Fjern rad", en: "Remove row" },
  proj_doc_add_row: { no: "Legg til rad", en: "Add row" },
  proj_doc_risk_legend: {
    no: "K = Konsekvens (1-5), S = Sannsynlighet (1-5). Risiko = K × S.",
    en: "K = Consequence (1-5), S = Likelihood (1-5). Risk = K × S.",
  },
  proj_doc_risk_lav: { no: "Lav", en: "Low" },
  proj_doc_risk_middels: { no: "Middels", en: "Medium" },
  proj_doc_risk_hoey: { no: "Høy", en: "High" },
  proj_doc_risk_na: { no: "N/A", en: "N/A" },
  proj_doc_risk_response_placeholder: {
    no: "Besvarelse / tiltak",
    en: "Response / measure",
  },
  proj_doc_contact_field_name: { no: "Navn", en: "Name" },
  proj_doc_contact_field_phone: { no: "Telefon", en: "Phone" },
  proj_doc_contact_field_email: { no: "E-post", en: "Email" },
  proj_doc_norms_edition: { no: "Utgave:", en: "Edition:" },
  proj_doc_norms_edition_placeholder: { no: "f.eks. 2022", en: "e.g. 2022" },
  proj_doc_norms_other: { no: "Annet — beskrivelse", en: "Other — description" },
  proj_doc_norms_other_hint: {
    no: "Andre normer / standarder benyttet",
    en: "Other norms / standards used",
  },

  // Document editor server-action errors
  proj_doc_err_no_sig_profile: {
    no: "Du må tegne signatur i Min profil før du kan signere.",
    en: "You must draw a signature in My profile before you can sign.",
  },
  proj_doc_err_samsvar_role: {
    no: "Samsvarserklæring kan kun signeres av Installatør eller Bemyndiget person.",
    en: "Samsvarserklæring can only be signed by Installatør or Bemyndiget person.",
  },
  proj_doc_err_project_not_found: {
    no: "Prosjekt ikke funnet.",
    en: "Project not found.",
  },
  proj_doc_err_load_failed: {
    no: "Klarte ikke laste dokument.",
    en: "Failed to load document.",
  },
  proj_doc_err_pdf_upload: {
    no: "PDF-opplasting feilet:",
    en: "PDF upload failed:",
  },
  proj_doc_err_parent_not_found: {
    no: "Foreldreoppgave ikke funnet.",
    en: "Parent document not found.",
  },
  proj_doc_err_internal_only_signed: {
    no: "Internkontroll kan kun startes på signerte dokumenter.",
    en: "Internal control can only be started on signed documents.",
  },
  proj_doc_err_missing_required: {
    no: "Kan ikke signeres — obligatoriske felt mangler: {fields}",
    en: "Cannot be signed — required fields missing: {fields}",
  },
};
