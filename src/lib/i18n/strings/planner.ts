import type { TranslationDict } from "./types";

// Planner-mode pages: projects, tasks, kanban, calendar, customers, sites, map, production schedule.
// Add new keys here.
export const PLANNER: TranslationDict = {
  // Gantt sections / reorder
  gantt_edit_order: { no: "Rediger rekkefølge", en: "Edit order" },
  gantt_done_editing: { no: "Ferdig", en: "Done" },
  gantt_new_section: { no: "Ny seksjon", en: "New section" },
  gantt_section_name_placeholder: {
    no: "F.eks. BID12 Bergen",
    en: "E.g. BID12 Bergen",
  },
  gantt_unsectioned: { no: "Uten seksjon", en: "Unsectioned" },
  gantt_move_up: { no: "Flytt opp", en: "Move up" },
  gantt_move_down: { no: "Flytt ned", en: "Move down" },
  gantt_rename: { no: "Gi nytt navn", en: "Rename" },
  gantt_move_to_section: { no: "Flytt til seksjon", en: "Move to section" },
  gantt_delete_section_confirm: {
    no: 'Slette seksjonen "{name}"? Team i seksjonen blir ikke slettet, men havner i Uten seksjon.',
    en: 'Delete the section "{name}"? Teams in the section are not deleted but move to Unsectioned.',
  },

  // ----- Tasks (mine-oppgaver / oppgaver) -----
  task_my_title: { no: "Mine oppgaver", en: "My tasks" },
  task_my_nothing_subtitle: {
    no: "Ingenting venter på deg akkurat nå. 🎉",
    en: "Nothing waiting for you right now. 🎉",
  },
  task_my_count_subtitle: {
    no: "{n} ting krever oppmerksomhet",
    en: "{n} item(s) need attention",
  },
  task_my_all_clear: {
    no: "Alt er ajour. Ingen åpne avvik, dokumentutkast, prosjekter eller utløpende kursbevis tildelt deg.",
    en: "All caught up. No open deviations, document drafts, projects or expiring certificates assigned to you.",
  },
  task_my_assigned_tasks: { no: "Oppgaver tildelt meg ({n})", en: "Tasks assigned to me ({n})" },
  task_my_assigned_deviations: {
    no: "Avvik tildelt meg ({n})",
    en: "Deviations assigned to me ({n})",
  },
  task_my_drafts: {
    no: "Dokumentutkast jeg har laget ({n})",
    en: "Document drafts I have created ({n})",
  },
  task_my_assigned_projects: {
    no: "Prosjekter tildelt meg ({n})",
    en: "Projects assigned to me ({n})",
  },
  task_my_expiring_certs: {
    no: "Kursbevis som utløper innen 90 dager ({n})",
    en: "Certificates expiring within 90 days ({n})",
  },
  task_due_label: { no: "frist", en: "due" },
  task_expires_label: { no: "Utløper", en: "Expires" },
  task_days_ago: { no: "{n} d siden", en: "{n} d ago" },
  task_days_left: { no: "{n} d igjen", en: "{n} d left" },

  // Tasks list page
  task_list_title: { no: "Oppgaver", en: "Tasks" },
  task_list_subtitle: {
    no: "Planning-tasks knyttet til prosjekt eller frittstående. Tildelt individ eller gruppe.",
    en: "Planning tasks linked to a project or standalone. Assigned to an individual or group.",
  },
  task_new: { no: "Ny oppgave", en: "New task" },
  task_tab_mine: { no: "Mine oppgaver", en: "My tasks" },
  task_tab_all: { no: "Alle oppgaver", en: "All tasks" },
  task_tab_board: { no: "Tavle", en: "Board" },
  task_stat_open: { no: "Åpne", en: "Open" },
  task_stat_completed: { no: "Fullført", en: "Completed" },
  task_stat_avg_resolve: { no: "Snitt løsetid", en: "Avg. resolve time" },
  task_empty_mine: { no: "Ingen oppgaver tildelt deg. 🎉", en: "No tasks assigned to you. 🎉" },
  task_empty_all: { no: "Ingen oppgaver registrert ennå.", en: "No tasks registered yet." },
  task_empty_create_link: { no: "Opprett en", en: "Create one" },
  task_col_title: { no: "Tittel", en: "Title" },
  task_col_type: { no: "Type", en: "Type" },
  task_col_project: { no: "Prosjekt", en: "Project" },
  task_col_assigned: { no: "Tildelt", en: "Assigned" },
  task_col_due: { no: "Frist", en: "Due" },
  task_col_status: { no: "Status", en: "Status" },
  task_assignee_group: { no: "(gruppe)", en: "(group)" },
  task_assignee_none: { no: "(ingen)", en: "(none)" },
  task_board_empty: { no: "Tom", en: "Empty" },

  // Task status labels
  task_status_initiated: { no: "Startet", en: "Initiated" },
  task_status_in_progress: { no: "Pågår", en: "In progress" },
  task_status_resolved: { no: "Løst", en: "Resolved" },

  // New task form
  task_new_subtitle: {
    no: "Lag en oppgave knyttet til et prosjekt eller frittstående.",
    en: "Create a task linked to a project or standalone.",
  },
  task_card_task: { no: "Oppgave", en: "Task" },
  task_card_linking: { no: "Knytning", en: "Linking" },
  task_field_title: { no: "Tittel", en: "Title" },
  task_field_description: { no: "Beskrivelse", en: "Description" },
  task_field_type: { no: "Type", en: "Type" },
  task_field_due_optional: { no: "Frist (valgfri)", en: "Due date (optional)" },
  task_field_due: { no: "Frist", en: "Due date" },
  task_field_status: { no: "Status", en: "Status" },
  task_field_project_optional: { no: "Prosjekt (valgfri)", en: "Project (optional)" },
  task_field_project: { no: "Prosjekt", en: "Project" },
  task_field_assigned_person: { no: "Tildelt person", en: "Assigned person" },
  task_field_or_assigned_group: { no: "ELLER tildelt gruppe", en: "OR assigned group" },
  task_field_assigned_group: { no: "Tildelt gruppe", en: "Assigned group" },
  task_opt_no_type: { no: "— Ingen type —", en: "— No type —" },
  task_opt_standalone: { no: "— Frittstående —", en: "— Standalone —" },
  task_opt_none_or_group: { no: "— Ingen / til gruppe —", en: "— None / to group —" },
  task_opt_no_group: { no: "— Ingen gruppe —", en: "— No group —" },
  task_group_hint: {
    no: "Du kan velge enten en person, en gruppe, eller begge. Gruppe-tildeling gjør at oppgaven dukker opp i alle gruppe-medlemmenes «Mine oppgaver».",
    en: "You can choose either a person, a group, or both. Group assignment makes the task appear in all group members' «My tasks».",
  },
  task_creating: { no: "Oppretter…", en: "Creating…" },
  task_create_btn: { no: "Opprett oppgave", en: "Create task" },

  // Task detail
  task_back_to_list: { no: "← Oppgaver", en: "← Tasks" },
  task_card_assignment: { no: "Tildeling", en: "Assignment" },
  task_label_person: { no: "Person:", en: "Person:" },
  task_label_group: { no: "Gruppe:", en: "Group:" },
  task_label_created_by: { no: "Opprettet av:", en: "Created by:" },
  task_card_details: { no: "Detaljer", en: "Details" },
  task_label_project: { no: "Prosjekt:", en: "Project:" },
  task_value_standalone: { no: "Frittstående", en: "Standalone" },
  task_label_due_colon: { no: "Frist:", en: "Due:" },
  task_label_created: { no: "Opprettet:", en: "Created:" },
  task_label_resolved: { no: "Løst:", en: "Resolved:" },
  task_label_description: { no: "Beskrivelse", en: "Description" },

  // Edit task
  task_edit_title: { no: "Rediger oppgave", en: "Edit task" },
  task_saving: { no: "Lagrer…", en: "Saving…" },
  task_save_changes: { no: "Lagre endringer", en: "Save changes" },

  // Delete task
  task_delete_confirm: {
    no: "Slette oppgaven \"{title}\"?",
    en: "Delete the task \"{title}\"?",
  },
  task_error_prefix: { no: "Feil: ", en: "Error: " },

  // Server action errors
  task_err_not_logged_in: { no: "Ikke logget inn.", en: "Not signed in." },
  task_err_title_required: { no: "Tittel er påkrevd.", en: "Title is required." },

  // ----- Customers (kunder) -----
  cust_title: { no: "Kunder", en: "Customers" },
  cust_subtitle: {
    no: "Alle kunder Echoo jobber for. Kunder kan ha flere sites og prosjekter.",
    en: "All customers Echoo works for. Customers can have multiple sites and projects.",
  },
  cust_new: { no: "Ny kunde", en: "New customer" },
  cust_search_placeholder: {
    no: "Søk på navn, org.nr., kontakt eller sted…",
    en: "Search by name, org. number, contact or city…",
  },
  cust_show_active: { no: "Aktive", en: "Active" },
  cust_show_all: { no: "Alle (inkl. inaktive)", en: "All (incl. inactive)" },
  cust_filter: { no: "Filtrer", en: "Filter" },
  cust_empty: { no: "Ingen kunder ennå.", en: "No customers yet." },
  cust_empty_create_first: { no: "Opprett den første", en: "Create the first one" },
  cust_col_name: { no: "Navn", en: "Name" },
  cust_col_org_number: { no: "Org.nr.", en: "Org. no." },
  cust_col_contact: { no: "Kontakt", en: "Contact" },
  cust_col_city: { no: "Sted", en: "City" },
  cust_col_status: { no: "Status", en: "Status" },
  cust_status_active: { no: "Aktiv", en: "Active" },
  cust_status_inactive: { no: "Inaktiv", en: "Inactive" },

  // Customer form
  cust_card_basic: { no: "Grunnleggende info", en: "Basic info" },
  cust_field_company_name: { no: "Firmanavn", en: "Company name" },
  cust_field_org_number: { no: "Organisasjonsnummer", en: "Organisation number" },
  cust_field_contact_person: { no: "Kontaktperson", en: "Contact person" },
  cust_field_email: { no: "E-post", en: "Email" },
  cust_field_phone: { no: "Telefon", en: "Phone" },
  cust_card_address: { no: "Adresse", en: "Address" },
  cust_field_street: { no: "Gateadresse", en: "Street address" },
  cust_field_postal_code: { no: "Postnr.", en: "Postal code" },
  cust_field_city: { no: "Sted", en: "City" },
  cust_card_map_color: { no: "Kartfarge", en: "Map color" },
  cust_map_color_hint: {
    no: "Brukes på markøren i kartet for å skille kundens sites fra andre. La stå på standard hvis du vil bruke Echoo-oransje.",
    en: "Used on the marker in the map to distinguish this customer's sites from others. Leave on default to use Echoo-orange.",
  },
  cust_card_notes: { no: "Notater", en: "Notes" },
  cust_field_internal_notes: { no: "Interne notater", en: "Internal notes" },
  cust_internal_notes_hint: {
    no: "Vises kun internt for Echoo",
    en: "Shown only internally for Echoo",
  },
  cust_active_label: { no: "Kunde er aktiv", en: "Customer is active" },
  cust_inactive_hint: {
    no: "Inaktive kunder skjules som standard fra lister, men eksisterende prosjekter beholdes.",
    en: "Inactive customers are hidden by default from lists, but existing projects are kept.",
  },
  cust_create_btn: { no: "Opprett kunde", en: "Create customer" },

  // Color picker
  cust_color_default_label: {
    no: "Bruker Echoo-oransje (standard)",
    en: "Uses Echoo-orange (default)",
  },
  cust_color_custom_label: { no: "Tilpasset farge", en: "Custom color" },
  cust_color_reset: { no: "Tilbakestill", en: "Reset" },
  cust_color_quick: { no: "Hurtigvalg", en: "Quick choice" },
  cust_color_custom_section: { no: "Egendefinert", en: "Custom" },

  // New customer page
  cust_new_subtitle: {
    no: "Legg inn en ny kunde. Du kan koble sites og prosjekter til denne kunden senere.",
    en: "Add a new customer. You can link sites and projects to this customer later.",
  },

  // Customer detail
  cust_back_all: { no: "← Alle kunder", en: "← All customers" },
  cust_card_contact: { no: "Kontakt", en: "Contact" },
  cust_label_contact_person: { no: "Kontaktperson:", en: "Contact person:" },
  cust_label_email: { no: "E-post:", en: "Email:" },
  cust_label_phone: { no: "Telefon:", en: "Phone:" },
  cust_sites_count: { no: "Sites ({n})", en: "Sites ({n})" },
  cust_no_sites: { no: "Ingen sites registrert.", en: "No sites registered." },
  cust_add_site: { no: "Legg til", en: "Add" },
  cust_projects_count: { no: "Prosjekter ({n})", en: "Projects ({n})" },
  cust_no_projects: { no: "Ingen prosjekter knyttet.", en: "No projects linked." },

  // Customer delete
  cust_delete_confirm: {
    no: "Slette kunden \"{name}\"? Sites og prosjekter beholdes men mister kobling.",
    en: "Delete the customer \"{name}\"? Sites and projects are kept but lose their link.",
  },

  // Edit customer
  cust_edit_title: { no: "Rediger kunde", en: "Edit customer" },

  // Server action errors
  cust_err_not_logged_in: { no: "Ikke logget inn.", en: "Not signed in." },

  // ----- Sites -----
  site_title: { no: "Sites", en: "Sites" },
  site_subtitle: {
    no: "Fysiske lokasjoner med koordinater. Knyttes til kunde og prosjekt.",
    en: "Physical locations with coordinates. Linked to customer and project.",
  },
  site_show_on_map: { no: "Vis på kart", en: "Show on map" },
  site_import_csv: { no: "Importer CSV", en: "Import CSV" },
  site_new: { no: "Nytt site", en: "New site" },
  site_search_placeholder: {
    no: "Søk på navn, site-ID, adresse eller sted…",
    en: "Search by name, site ID, address or city…",
  },
  site_filter: { no: "Filtrer", en: "Filter" },
  site_empty: { no: "Ingen sites ennå.", en: "No sites yet." },
  site_empty_create_first: { no: "Opprett det første", en: "Create the first one" },
  site_col_name: { no: "Navn", en: "Name" },
  site_col_site_id: { no: "Site ID", en: "Site ID" },
  site_col_customer: { no: "Kunde", en: "Customer" },
  site_col_address: { no: "Adresse", en: "Address" },
  site_col_coords: { no: "Koordinater", en: "Coordinates" },
  site_coords_missing: { no: "Mangler", en: "Missing" },

  // Geocode button
  site_geocode_confirm: {
    no: "Geokode {n} sites uten koordinater? Tar ca. {min} min (bruker OpenStreetMap, 1 req/sek).",
    en: "Geocode {n} sites without coordinates? Takes about {min} min (uses OpenStreetMap, 1 req/sec).",
  },
  site_geocode_missing_label: {
    no: "{n} sites mangler koordinater",
    en: "{n} sites are missing coordinates",
  },
  site_geocode_help: {
    no: "Trykk for å automatisk hente koordinater fra adresse via OpenStreetMap. Tar ca. 1 sek pr. site.",
    en: "Click to automatically fetch coordinates from the address via OpenStreetMap. Takes about 1 sec per site.",
  },
  site_geocode_running: { no: "Geokoder…", en: "Geocoding…" },
  site_geocode_done: {
    no: "Ferdig — {ok} ok, {failed} feilet",
    en: "Done — {ok} ok, {failed} failed",
  },
  site_geocode_current: { no: "Nå: {name}", en: "Now: {name}" },
  site_geocode_failed_hint: {
    no: "{n} adresser ble ikke gjenkjent — sjekk dem manuelt i Sites og oppgi koordinater direkte.",
    en: "{n} addresses were not recognised — check them manually in Sites and provide coordinates directly.",
  },
  site_geocode_now: { no: "Geokod nå", en: "Geocode now" },

  // Site form
  site_card_basic: { no: "Grunnleggende info", en: "Basic info" },
  site_field_name: { no: "Site-navn", en: "Site name" },
  site_field_customer: { no: "Kunde", en: "Customer" },
  site_field_type: { no: "Site type", en: "Site type" },
  site_field_external_id: { no: "Site ID (eksternt)", en: "Site ID (external)" },
  site_field_external_id_hint: {
    no: "Kundens eget ID (Telenor ROT…, etc.)",
    en: "Customer's own ID (Telenor ROT…, etc.)",
  },
  site_field_ssb: { no: "SSB-nr.", en: "SSB no." },
  site_opt_none: { no: "— Ingen —", en: "— None —" },
  site_opt_select: { no: "— Velg —", en: "— Select —" },
  site_type_residential: { no: "Bolig", en: "Residential" },
  site_type_commercial: { no: "Næringsbygg", en: "Commercial building" },
  site_type_mast: { no: "Mast / Tårn", en: "Mast / Tower" },
  site_type_base_indoor: { no: "Basestasjon innendørs", en: "Base station indoor" },
  site_type_base_outdoor: { no: "Basestasjon utendørs", en: "Base station outdoor" },
  site_type_data_center: { no: "Datasenter / hytte", en: "Data center / hut" },
  site_type_cable: { no: "Kabelfremføring", en: "Cable routing" },
  site_type_charger: { no: "Ladestasjon", en: "Charging station" },
  site_type_other: { no: "Annet", en: "Other" },
  site_card_address: { no: "Adresse", en: "Address" },
  site_field_street: { no: "Gateadresse", en: "Street address" },
  site_field_postal_code: { no: "Postnr.", en: "Postal code" },
  site_field_city: { no: "Sted", en: "City" },
  site_field_province: { no: "Fylke / region", en: "County / region" },
  site_card_coords: { no: "Koordinater (for kart-visning)", en: "Coordinates (for map view)" },
  site_field_latitude: { no: "Breddegrad (latitude)", en: "Latitude" },
  site_field_longitude: { no: "Lengdegrad (longitude)", en: "Longitude" },
  site_lat_hint: { no: "f.eks. 59.9139", en: "e.g. 59.9139" },
  site_lon_hint: { no: "f.eks. 10.7522", en: "e.g. 10.7522" },
  site_coords_tip: {
    no: "Tip: høyreklikk på Google Maps → første tall er bredde, andre er lengde.",
    en: "Tip: right-click on Google Maps → first number is latitude, second is longitude.",
  },
  site_card_notes: { no: "Notater", en: "Notes" },
  site_field_internal_notes: { no: "Interne notater", en: "Internal notes" },
  site_err_coords_numeric: {
    no: "Koordinater må være tall (f.eks. 59.9139)",
    en: "Coordinates must be numbers (e.g. 59.9139)",
  },
  site_create_btn: { no: "Opprett site", en: "Create site" },

  // New site page
  site_new_subtitle: {
    no: "Legg til en fysisk lokasjon med koordinater for kartvisning.",
    en: "Add a physical location with coordinates for map view.",
  },

  // Site detail
  site_back_all: { no: "← Alle sites", en: "← All sites" },
  site_label_ssb_inline: { no: "SSB-nr:", en: "SSB no.:" },
  site_open_in_google: { no: "Åpne i Google Maps", en: "Open in Google Maps" },
  site_no_coords: { no: "Ingen koordinater registrert.", en: "No coordinates registered." },
  site_projects_on_site: { no: "Prosjekter på dette sitet", en: "Projects on this site" },
  site_no_projects: {
    no: "Ingen prosjekter knyttet til dette sitet ennå.",
    en: "No projects linked to this site yet.",
  },

  // Site delete
  site_delete_confirm: {
    no: "Slette site \"{name}\"? Prosjekter beholdes men mister kobling.",
    en: "Delete site \"{name}\"? Projects are kept but lose their link.",
  },

  // Edit site
  site_edit_title: { no: "Rediger site", en: "Edit site" },

  // Site server action errors
  site_err_not_logged_in: { no: "Ikke logget inn.", en: "Not signed in." },
  site_err_not_found: { no: "Fant ikke sitet.", en: "Site not found." },
  site_err_no_address_info: {
    no: "Ingen adresseinformasjon å geokode.",
    en: "No address information to geocode.",
  },
  site_err_no_coords_found: {
    no: "Fant ingen koordinater for adressen.",
    en: "No coordinates found for the address.",
  },

  // ----- Kanban -----
  kanban_title: { no: "Kanban", en: "Kanban" },
  kanban_subtitle: {
    no: "Flytt prosjekter mellom stages ved å klikke på \"Flytt\"-menyen. Standardstages: Salg → TSSR → Planlegging → Produksjon → ABD → Ferdig.",
    en: "Move projects between stages by clicking the \"Move\" menu. Default stages: Sales → TSSR → Planning → Production → ABD → Done.",
  },
  kanban_col_no_stage: { no: "Uten stage", en: "No stage" },
  kanban_col_empty: { no: "Tom", en: "Empty" },
  kanban_move: { no: "Flytt", en: "Move" },
  kanban_remove_stage: { no: "⊘ Fjern stage", en: "⊘ Remove stage" },

  // ----- Calendar -----
  cal_title: { no: "Kalender", en: "Calendar" },
  cal_subtitle: {
    no: "Planlagte prosjekter, avvik og signerte dokumenter måned for måned.",
    en: "Scheduled projects, deviations and signed documents month by month.",
  },
  cal_today: { no: "I dag", en: "Today" },
  cal_legend_start: { no: "Planlagt start", en: "Scheduled start" },
  cal_legend_end: { no: "Frist/slutt", en: "Due/end" },
  cal_legend_deviation: { no: "Avvik", en: "Deviation" },
  cal_legend_signed: { no: "Signert dokument", en: "Signed document" },
  cal_month_january: { no: "januar", en: "January" },
  cal_month_february: { no: "februar", en: "February" },
  cal_month_march: { no: "mars", en: "March" },
  cal_month_april: { no: "april", en: "April" },
  cal_month_may: { no: "mai", en: "May" },
  cal_month_june: { no: "juni", en: "June" },
  cal_month_july: { no: "juli", en: "July" },
  cal_month_august: { no: "august", en: "August" },
  cal_month_september: { no: "september", en: "September" },
  cal_month_october: { no: "oktober", en: "October" },
  cal_month_november: { no: "november", en: "November" },
  cal_month_december: { no: "desember", en: "December" },
  cal_weekday_mon: { no: "Man", en: "Mon" },
  cal_weekday_tue: { no: "Tir", en: "Tue" },
  cal_weekday_wed: { no: "Ons", en: "Wed" },
  cal_weekday_thu: { no: "Tor", en: "Thu" },
  cal_weekday_fri: { no: "Fre", en: "Fri" },
  cal_weekday_sat: { no: "Lør", en: "Sat" },
  cal_weekday_sun: { no: "Søn", en: "Sun" },
  cal_events_count: { no: "{n} hendelser", en: "{n} events" },
  cal_event_due_suffix: { no: "frist", en: "due" },
  cal_event_deviation_label: { no: "Avvik ({sev})", en: "Deviation ({sev})" },
  cal_event_signed_label: { no: "Signert", en: "Signed" },

  // Document kind labels (used by calendar / my-tasks)
  cal_kind_risk: { no: "Risikovurdering", en: "Risk assessment" },
  cal_kind_final: { no: "Sluttkontroll", en: "Final inspection" },
  cal_kind_conformity: { no: "Samsvarserklæring", en: "Declaration of conformity" },
  cal_kind_simplified: { no: "Forenklet sikkerhet", en: "Simplified safety" },
  cal_kind_sja: { no: "SJA", en: "SJA" },
  cal_kind_ruh: { no: "RUH", en: "RUH" },
  cal_kind_startup: { no: "Oppstartssjekkliste", en: "Startup checklist" },
  cal_kind_startup_short: { no: "Oppstartssjekk", en: "Startup check" },
  cal_kind_sampling: { no: "Stikkprøvekontroll", en: "Random sampling check" },
  cal_kind_internal: { no: "Internkontroll", en: "Internal control" },
  cal_kind_custom: { no: "Egendefinert", en: "Custom" },

  // ----- Production schedule (Gantt) -----
  sched_title: { no: "Produksjonsplan", en: "Production schedule" },
  sched_subtitle: {
    no: "Gantt-visning av planlagte oppdrag — team i loddrette baner, tid horisontalt.",
    en: "Gantt view of scheduled jobs — teams in vertical lanes, time horizontal.",
  },
  sched_visible_count: { no: " {n} oppdrag synlig.", en: " {n} jobs visible." },
  sched_prev_week: { no: "← Forrige uke", en: "← Previous week" },
  sched_today: { no: "I dag", en: "Today" },
  sched_next_week: { no: "Neste uke →", en: "Next week →" },
  sched_place_job: { no: "Plasser oppdrag", en: "Place job" },
  gantt_header_team: { no: "Team / Gruppe", en: "Team / Group" },
  gantt_no_team: { no: "Uten team", en: "No team" },
  gantt_untitled: { no: "Uten tittel", en: "Untitled" },
  gantt_locked_prefix: { no: "Låst: ", en: "Locked: " },
  gantt_tooltip_click: { no: "Klikk for å redigere", en: "Click to edit" },
  gantt_no_jobs: { no: "Ingen oppdrag", en: "No jobs" },
  gantt_status_label: { no: "Status:", en: "Status:" },
  gantt_status_planned: { no: "Planlagt", en: "Planned" },
  gantt_status_in_progress: { no: "Pågår", en: "In progress" },
  gantt_status_done: { no: "Ferdig", en: "Done" },
  gantt_status_revisit: { no: "Revurder", en: "Revisit" },
  gantt_locked: { no: "🔒 Låst", en: "🔒 Locked" },
  gantt_off_legend: { no: "Ferie / off-periode", en: "Vacation / off-period" },
  gantt_teams_board: {
    no: "Team i tavlen ({visible}/{total})",
    en: "Teams on board ({visible}/{total})",
  },
  gantt_show_all: { no: "Vis alle", en: "Show all" },
  gantt_hide_all: { no: "Skjul alle", en: "Hide all" },

  // Entry popup
  sched_edit_job: { no: "Rediger oppdrag", en: "Edit job" },
  sched_field_project: { no: "Prosjekt", en: "Project" },
  sched_project_hint_open: {
    no: "Klikk lenken for å åpne prosjektet",
    en: "Click the link to open the project",
  },
  sched_project_hint_oneoff: {
    no: "Engangs-oppføring uten prosjekt",
    en: "One-off entry without a project",
  },
  sched_opt_no_project: { no: "— Ingen prosjekt —", en: "— No project —" },
  sched_open_project: { no: "Åpne prosjektet", en: "Open project" },
  sched_field_team_swimlane: { no: "Team / Gruppe (swimlane)", en: "Team / Group (swimlane)" },
  sched_opt_no_team: { no: "— Uten team —", en: "— No team —" },
  sched_opt_no_group: { no: "— Ingen / Uten gruppe —", en: "— None / No group —" },
  sched_field_title_optional: { no: "Tittel (valgfri)", en: "Title (optional)" },
  sched_title_hint: {
    no: "Hvis tom, brukes prosjektets tittel",
    en: "If empty, the project's title is used",
  },
  sched_field_from_date: { no: "Fra dato", en: "From date" },
  sched_field_to_date: { no: "Til dato", en: "To date" },
  sched_field_status_override: { no: "Status (overstyr auto)", en: "Status (override auto)" },
  sched_lock_label: { no: "🔒 Lås (kan ikke flyttes)", en: "🔒 Lock (cannot be moved)" },
  sched_field_lock_reason: { no: "Grunn til lås", en: "Reason for lock" },
  sched_lock_placeholder: {
    no: "F.eks. Bekreftet avtale med kunde",
    en: "E.g. Confirmed agreement with customer",
  },
  sched_delete_confirm: {
    no: "Slette dette oppdraget fra produksjonsplanen?",
    en: "Delete this job from the production schedule?",
  },
  sched_close: { no: "Lukk", en: "Close" },

  // Off-period dialog
  sched_add_off: { no: "Legg til ferie/off", en: "Add vacation/off" },
  sched_add_off_title: { no: "Legg til off-periode", en: "Add off-period" },
  sched_field_team: { no: "Team / Gruppe", en: "Team / Group" },
  sched_team_hint_all: {
    no: "Tom = gjelder alle team (f.eks. nasjonal helligdag)",
    en: "Empty = applies to all teams (e.g. national holiday)",
  },
  sched_opt_all_teams: { no: "— Alle team —", en: "— All teams —" },
  sched_field_type: { no: "Type", en: "Type" },
  sched_reason_vacation: { no: "Ferie", en: "Vacation" },
  sched_reason_sick: { no: "Sykdom", en: "Sick" },
  sched_reason_holiday: { no: "Helligdag / fri", en: "Holiday / day off" },
  sched_reason_other: { no: "Annet", en: "Other" },
  sched_field_notes_optional: { no: "Notater (valgfri)", en: "Notes (optional)" },
  sched_lock_period_label: {
    no: "🔒 Lås perioden (kan ikke flyttes)",
    en: "🔒 Lock the period (cannot be moved)",
  },
  sched_lock_reason_long: { no: "Grunn til at den er låst", en: "Reason it is locked" },
  sched_add: { no: "Legg til", en: "Add" },

  // New schedule entry page
  sched_new_title: {
    no: "Plasser oppdrag på kalenderen",
    en: "Place job on the calendar",
  },
  sched_new_subtitle: {
    no: "Knytt et prosjekt til en periode og et team. Oppdraget vises i Gantt-visningen.",
    en: "Link a project to a period and a team. The job appears in the Gantt view.",
  },
  sched_card_linking: { no: "Knytning", en: "Linking" },
  sched_project_hint_card: {
    no: "Lar deg klikke baren for å åpne prosjektet",
    en: "Lets you click the bar to open the project",
  },
  sched_opt_oneoff: {
    no: "— Engangs-oppføring (ingen prosjekt) —",
    en: "— One-off entry (no project) —",
  },
  sched_title_placeholder: {
    no: "F.eks. Montasje uke 12 — Etappe 1",
    en: "E.g. Assembly week 12 — Stage 1",
  },
  sched_card_period_status: { no: "Periode og status", en: "Period and status" },
  sched_lock_dates_label: {
    no: "Lås datoene (kan ikke flyttes uten å låses opp)",
    en: "Lock the dates (cannot be moved without being unlocked)",
  },
  sched_lock_placeholder_kunde: {
    no: "F.eks. Kunden har lovet leveranse 15. mars",
    en: "E.g. Customer has promised delivery 15 March",
  },
  sched_card_notes: { no: "Notater", en: "Notes" },
  sched_place_on_calendar: { no: "Plasser på kalenderen", en: "Place on the calendar" },

  // Schedule server errors
  sched_err_not_logged_in: { no: "Ikke logget inn.", en: "Not signed in." },
  sched_err_no_rights_edit: {
    no: "Mangler rettigheter til å redigere planen.",
    en: "Missing rights to edit the schedule.",
  },
  sched_err_no_rights: { no: "Mangler rettigheter.", en: "Missing rights." },

  // ----- Map -----
  map_title: { no: "Kart", en: "Map" },
  map_count_subtitle: {
    no: "{n} sites med koordinater",
    en: "{n} sites with coordinates",
  },
  map_empty: {
    no: "Ingen sites med koordinater å vise.",
    en: "No sites with coordinates to display.",
  },
  map_empty_create: { no: "Opprett et site", en: "Create a site" },
  map_no_customer: { no: "Uten kunde", en: "No customer" },
  map_customers_count: { no: "Kunder ({n})", en: "Customers ({n})" },
  map_show_all: { no: "Vis alle", en: "Show all" },
  map_show_only: { no: "Vis kun denne", en: "Show only this" },
  map_only: { no: "Kun", en: "Only" },
  map_popup_customer: { no: "Kunde: ", en: "Customer: " },
};
