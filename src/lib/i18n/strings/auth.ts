import type { TranslationDict } from "./types";

// Login/auth/profile pages + the entry layout.
export const AUTH: TranslationDict = {
  login_subtitle: {
    no: "Kvalitet og produksjonsplan for elektroentreprenører",
    en: "Quality and production planning for electrical contractors",
  },
  login_footer: { no: "Echoo · Bygget av håndverkere", en: "Echoo · Built by tradespeople" },
  login_no_account: { no: "Har du ikke konto enda?", en: "Don't have an account yet?" },
  login_signup_link: { no: "Registrer bedriften din", en: "Register your company" },

  // Signup
  signup_subtitle: {
    no: "Bygget av håndverkere — for håndverkere",
    en: "Built by tradespeople — for tradespeople",
  },
  signup_title: { no: "Registrer bedriften din", en: "Register your company" },
  signup_beta_note: {
    no: "Gratis under beta. Ingen kortkrav. Si opp når som helst.",
    en: "Free during beta. No card required. Cancel anytime.",
  },
  signup_company_name: { no: "Bedriftsnavn", en: "Company name" },
  signup_company_placeholder: { no: "F.eks. Sørby Elektro AS", en: "E.g. Sørby Elektro AS" },
  signup_org_number: { no: "Org.nr (valgfritt)", en: "Organization number (optional)" },
  signup_org_number_hint: {
    no: "Norsk org.nr. Kan også settes senere i innstillinger.",
    en: "Norwegian organization number. Can also be set later in settings.",
  },
  signup_employee_count: { no: "Anslått antall ansatte", en: "Estimated number of employees" },
  signup_admin_intro: {
    no: "Du blir admin for bedriftens Echoo-konto. Du kan invitere kolleger etterpå.",
    en: "You'll be admin for your company's Echoo workspace. Invite colleagues afterwards.",
  },
  signup_your_name: { no: "Ditt navn", en: "Your name" },
  signup_password_hint: {
    no: "Minst 8 tegn.",
    en: "At least 8 characters.",
  },
  signup_create_btn: { no: "Opprett bedriftskonto", en: "Create company account" },
  signup_creating: { no: "Oppretter konto…", en: "Creating account…" },
  signup_already: { no: "Har du allerede konto?", en: "Already have an account?" },
  signup_login_link: { no: "Logg inn", en: "Sign in" },
  signup_terms_prefix: {
    no: "Ved å opprette konto godtar du Echoos bruksvilkår og personvernerklæring.",
    en: "By creating an account you accept Echoo's terms of service and privacy policy.",
  },
  signup_promise_flat: {
    no: "Fastpris per bedrift — ingen per-bruker-prising",
    en: "Flat rate per company — no per-user pricing",
  },
  signup_promise_unlimited: {
    no: "Ubegrenset antall ansatte og prosjekter",
    en: "Unlimited employees and projects",
  },
  signup_promise_no_card: {
    no: "Ingen kort under beta — bare opprett og prøv",
    en: "No card required during beta — just sign up and try",
  },

  // Signup errors
  signup_err_company_required: { no: "Bedriftsnavn er påkrevd.", en: "Company name is required." },
  signup_err_credentials_required: {
    no: "E-post og passord er påkrevd.",
    en: "Email and password are required.",
  },
  signup_err_name_required: { no: "Navn er påkrevd.", en: "Name is required." },
  signup_err_password_short: {
    no: "Passordet må være minst 8 tegn.",
    en: "Password must be at least 8 characters.",
  },
  signup_err_create_user: {
    no: "Klarte ikke å opprette bruker.",
    en: "Could not create user.",
  },
  signup_err_create_org: {
    no: "Klarte ikke å opprette bedrift.",
    en: "Could not create company.",
  },

  // Onboarding
  onboarding_title: { no: "Velkommen til Echoo 👋", en: "Welcome to Echoo 👋" },
  onboarding_subtitle: {
    no: "La oss få bedriften din klar på under 2 minutter.",
    en: "Let's get your company set up in under 2 minutes.",
  },
  onboarding_step1_title: { no: "1. Bedriftsinfo", en: "1. Company info" },
  onboarding_step1_desc: {
    no: "Adresse, kontakt, og installatør-info. Brukes på alle dokumenter og PDF-er.",
    en: "Address, contact, and installer info. Used on all documents and PDFs.",
  },
  onboarding_step1_cta: { no: "Fyll inn bedriftsinfo", en: "Fill in company info" },
  onboarding_step2_title: { no: "2. Logo (valgfritt)", en: "2. Logo (optional)" },
  onboarding_step2_desc: {
    no: "Last opp logoen så vises den i UI-en og på PDF-eksport.",
    en: "Upload your logo so it shows in the UI and on PDF exports.",
  },
  onboarding_step2_cta: { no: "Last opp logo", en: "Upload logo" },
  onboarding_step3_title: { no: "3. Inviter teamet", en: "3. Invite the team" },
  onboarding_step3_desc: {
    no: "Legg til kolleger så de kan signere dokumenter og oppdatere status.",
    en: "Add colleagues so they can sign documents and update status.",
  },
  onboarding_step3_cta: { no: "Inviter ansatte", en: "Invite employees" },
  onboarding_skip: { no: "Hopp over — gå rett til oversikten", en: "Skip — go straight to dashboard" },
  login_signing_in: { no: "Logger inn…", en: "Signing in…" },
  login_reset_sent_short: {
    no: "Tilbakestillingslenke er sendt på e-post.",
    en: "A reset link has been sent to your email.",
  },
  login_reset_sent_long: {
    no: "Tilbakestillingslenke er sendt — sjekk e-post.",
    en: "Reset link sent — check your email.",
  },
  login_need_email_first: {
    no: "Skriv inn e-posten din først.",
    en: "Enter your email first.",
  },

  // Profile page
  profile_title: { no: "Min profil", en: "My profile" },
  profile_subtitle: {
    no: "Personlig informasjon og signatur.",
    en: "Personal information and signature.",
  },
  profile_full_name: { no: "Fullt navn", en: "Full name" },
  profile_role: { no: "Rolle", en: "Role" },
  profile_email_label: { no: "E-post", en: "Email" },
  profile_phone: { no: "Telefon", en: "Phone" },
  profile_save: { no: "Lagre profil", en: "Save profile" },
  profile_saved: { no: "Profil lagret.", en: "Profile saved." },
  profile_saving: { no: "Lagrer…", en: "Saving…" },
  profile_certificates: { no: "Kursbevis", en: "Certificates" },
  profile_no_certificates: {
    no: "Du har ingen kursbevis registrert.",
    en: "You have no certificates registered.",
  },
  profile_change_password: { no: "Bytt passord", en: "Change password" },
  profile_new_password: { no: "Nytt passord", en: "New password" },
  profile_confirm_password: { no: "Bekreft passord", en: "Confirm password" },
  profile_password_mismatch: {
    no: "Passordene må være like.",
    en: "Passwords must match.",
  },
  profile_password_changed: {
    no: "Passordet er byttet.",
    en: "Password changed.",
  },

  profile_page_subtitle: {
    no: "Personlig informasjon og signatur for dokumenter.",
    en: "Personal information and signature for documents.",
  },
  profile_personalia: { no: "Personalia", en: "Personal details" },
  profile_title_label: { no: "Tittel", en: "Title" },
  profile_title_hint: {
    no: "F.eks. Elektromontør, Prosjektleder",
    en: "E.g. Electrician, Project manager",
  },
  profile_email_notifications: { no: "E-postvarsler", en: "Email notifications" },
  profile_email_notifications_help: {
    no: "Velg når Echoo skal sende deg e-post til",
    en: "Choose when Echoo should send you email to",
  },
  profile_notify_deviation_label: { no: "Avvik tildelt meg", en: "Deviation assigned to me" },
  profile_notify_deviation_hint: {
    no: "Send e-post når noen tildeler meg et avvik.",
    en: "Send email when someone assigns me a deviation.",
  },
  profile_notify_comment_label: {
    no: "Kommentar på prosjekt jeg er tildelt",
    en: "Comment on project assigned to me",
  },
  profile_notify_comment_hint: {
    no: "Send e-post når noen kommenterer på prosjekt jeg er tildelt.",
    en: "Send email when someone comments on a project assigned to me.",
  },
  profile_notify_task_label: { no: "Oppgave tildelt meg", en: "Task assigned to me" },
  profile_notify_task_hint: {
    no: "Send e-post når noen tildeler meg en oppgave.",
    en: "Send email when someone assigns me a task.",
  },
  profile_notify_digest_label: { no: "Daglig oppsummering", en: "Daily digest" },
  profile_notify_digest_hint: {
    no: "Få en oppsummering kl. 08:00 over alle åpne saker tildelt meg.",
    en: "Get a digest at 08:00 with all open items assigned to me.",
  },
  profile_signature_section: { no: "Min signatur", en: "My signature" },
  profile_signature_help_long: {
    no: "Tegn signaturen din én gang — den limes automatisk inn på alle dokumenter du signerer. Du kan endre den når som helst.",
    en: "Draw your signature once — it will be applied automatically to all documents you sign. You can change it at any time.",
  },
  profile_save_changes: { no: "Lagre endringer", en: "Save changes" },
  profile_saved_ok: { no: "✓ Lagret", en: "✓ Saved" },
};

