-- ============================================================
-- Echoo: alle 39 migrasjoner samlet i én fil.
-- Generert: 2026-06-06
-- Trygt å kjøre flere ganger (alt er idempotent).
-- Kjør i Supabase SQL Editor som én stor query.
-- ============================================================


-- ============================================================
-- 001_initial_schema.sql
-- ============================================================
-- OPCOM Elektro Kvalitet — initial schema
-- Run i Supabase SQL Editor (Project → SQL → New query).

------------------------------------------------------------------
-- Extensions
------------------------------------------------------------------
create extension if not exists "pgcrypto";

------------------------------------------------------------------
-- Enums
------------------------------------------------------------------
do $$ begin
  create type user_role as enum (
    'admin',
    'installator',
    'bemyndiget',
    'prosjektleder',
    'elektriker',
    'montor'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum ('aktiv', 'paa_vent', 'ferdigstilt', 'arkivert');
exception when duplicate_object then null; end $$;

do $$ begin
  create type installation_type as enum ('bolig', 'naering', 'telecom', 'ev');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_kind as enum (
    'risikovurdering',
    'sluttkontroll',
    'samsvarserklaering',
    'forenklet_sikkerhet',
    'sja',
    'ruh',
    'startup_checklist',
    'stikkprovekontroll',
    'internkontroll',
    'custom'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_status as enum ('utkast', 'signert');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deviation_severity as enum ('lav', 'middels', 'hoey', 'kritisk');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deviation_status as enum ('apen', 'under_arbeid', 'lukket');
exception when duplicate_object then null; end $$;

------------------------------------------------------------------
-- profiles  (extends auth.users)
------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  title text,
  phone text,
  role user_role not null default 'elektriker',
  signature_data_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role) where active = true;

------------------------------------------------------------------
-- projects
------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_number text not null unique,
  title text not null,
  customer_name text,
  customer_org_number text,
  customer_contact text,
  customer_email text,
  customer_phone text,
  customer_address text,
  customer_postal_code text,
  customer_city text,
  site_company text,
  site_address text,
  site_house_number text,
  site_house_letter text,
  site_postal_code text,
  site_city text,
  site_ssb_number text,
  description text,
  installation_type installation_type default 'bolig',
  status project_status not null default 'aktiv',
  created_by uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_assigned on public.projects(assigned_to);
create index if not exists idx_projects_created_by on public.projects(created_by);

------------------------------------------------------------------
-- documents  (Risikovurdering / Sluttkontroll / Samsvarserklæring)
-- Hver re-signering oppretter en ny rad med inkrementert version.
------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind document_kind not null,
  version integer not null default 1,
  status document_status not null default 'utkast',
  data jsonb not null default '{}'::jsonb,        -- skjemafelter
  pdf_path text,                                   -- Supabase Storage path (documents/...)
  signed_by uuid references public.profiles(id),
  signed_at timestamptz,
  signature_snapshot text,                         -- data URL frosset på signering
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, kind, version)
);

create index if not exists idx_documents_project on public.documents(project_id);
create index if not exists idx_documents_kind on public.documents(kind);

------------------------------------------------------------------
-- deviations  (avvik per prosjekt)
------------------------------------------------------------------
create table if not exists public.deviations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  severity deviation_severity not null default 'middels',
  status deviation_status not null default 'apen',
  reported_by uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  resolution text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_deviations_project on public.deviations(project_id);
create index if not exists idx_deviations_status on public.deviations(status);

------------------------------------------------------------------
-- certificates  (kursbevis per bruker)
------------------------------------------------------------------
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  issuer text,
  issued_date date,
  expires_date date,
  file_path text not null,                         -- Storage path (certificates/...)
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_certificates_profile on public.certificates(profile_id);
create index if not exists idx_certificates_expires on public.certificates(expires_date);

------------------------------------------------------------------
-- audit_log  (sporbarhet for compliance)
------------------------------------------------------------------
create table if not exists public.audit_log (
  id bigserial primary key,
  actor_id uuid references public.profiles(id),
  action text not null,            -- e.g. 'document.signed', 'user.created'
  entity_type text not null,       -- e.g. 'document', 'profile'
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_actor on public.audit_log(actor_id);
create index if not exists idx_audit_entity on public.audit_log(entity_type, entity_id);

------------------------------------------------------------------
-- updated_at triggers
------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ begin
  create trigger trg_profiles_updated before update on public.profiles
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_projects_updated before update on public.projects
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_documents_updated before update on public.documents
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_deviations_updated before update on public.deviations
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_certificates_updated before update on public.certificates
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

------------------------------------------------------------------
-- Helper: gjeldende brukers rolle
------------------------------------------------------------------
create or replace function public.current_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin' and active = true
  )
$$;

create or replace function public.is_active()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and active = true
  )
$$;

------------------------------------------------------------------
-- Auto-opprett profile når ny auth.users opprettes
------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
  v_full_name text;
begin
  v_role := coalesce(
    (new.raw_user_meta_data->>'role')::user_role,
    'elektriker'::user_role
  );
  v_full_name := new.raw_user_meta_data->>'full_name';

  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, v_full_name, v_role)
  on conflict (id) do nothing;

  return new;
end $$;

do $$ begin
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception when duplicate_object then null; end $$;

------------------------------------------------------------------
-- ROW LEVEL SECURITY
------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.deviations enable row level security;
alter table public.certificates enable row level security;
alter table public.audit_log enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (public.is_active());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert with check (public.is_admin());

-- projects: alle aktive brukere kan se og opprette; admin og prosjektleder kan oppdatere alt
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select using (public.is_active());

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert with check (public.is_active() and created_by = auth.uid());

drop policy if exists projects_update_assigned on public.projects;
create policy projects_update_assigned on public.projects
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'prosjektleder')
      or assigned_to = auth.uid()
      or created_by = auth.uid()
    )
  );

drop policy if exists projects_delete_admin on public.projects;
create policy projects_delete_admin on public.projects
  for delete using (public.is_admin());

-- documents: synlig for alle aktive; opprettes av aktive; oppdateres mens utkast
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select using (public.is_active());

drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents
  for insert with check (public.is_active() and created_by = auth.uid());

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'prosjektleder')
      or created_by = auth.uid()
    )
  );

-- Læres ikke å slette signerte dokumenter — kun admin på utkast
drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents
  for delete using (public.is_admin() and status = 'utkast');

-- deviations
drop policy if exists deviations_select on public.deviations;
create policy deviations_select on public.deviations
  for select using (public.is_active());

drop policy if exists deviations_insert on public.deviations;
create policy deviations_insert on public.deviations
  for insert with check (public.is_active() and reported_by = auth.uid());

drop policy if exists deviations_update on public.deviations;
create policy deviations_update on public.deviations
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'prosjektleder')
      or assigned_to = auth.uid()
      or reported_by = auth.uid()
    )
  );

-- certificates: bruker ser/eier egne, admin ser alle
drop policy if exists certificates_select on public.certificates;
create policy certificates_select on public.certificates
  for select using (profile_id = auth.uid() or public.is_admin());

drop policy if exists certificates_insert on public.certificates;
create policy certificates_insert on public.certificates
  for insert with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists certificates_update on public.certificates;
create policy certificates_update on public.certificates
  for update using (profile_id = auth.uid() or public.is_admin());

drop policy if exists certificates_delete on public.certificates;
create policy certificates_delete on public.certificates
  for delete using (profile_id = auth.uid() or public.is_admin());

-- audit_log: kun lesing for admin
drop policy if exists audit_select_admin on public.audit_log;
create policy audit_select_admin on public.audit_log
  for select using (public.is_admin());

drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log
  for insert with check (public.is_active());


-- ============================================================
-- 002_storage_buckets.sql
-- ============================================================
-- Storage buckets og policies
-- Kjør etter 001_initial_schema.sql

------------------------------------------------------------------
-- Buckets (private — kun signert URL eller via auth)
------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('certificates', 'certificates', false),
  ('documents', 'documents', false),
  ('project-files', 'project-files', false)
on conflict (id) do nothing;

------------------------------------------------------------------
-- certificates: brukere håndterer egne, admin ser alle
-- Path-konvensjon: {profile_id}/{filnavn}
------------------------------------------------------------------
drop policy if exists "cert_select_own" on storage.objects;
create policy "cert_select_own" on storage.objects for select
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );

drop policy if exists "cert_insert_own" on storage.objects;
create policy "cert_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );

drop policy if exists "cert_update_own" on storage.objects;
create policy "cert_update_own" on storage.objects for update
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );

drop policy if exists "cert_delete_own" on storage.objects;
create policy "cert_delete_own" on storage.objects for delete
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );

------------------------------------------------------------------
-- documents: alle aktive brukere kan lese; opprett ved insert
-- Path-konvensjon: {project_id}/{kind}/v{n}.pdf
------------------------------------------------------------------
drop policy if exists "docs_select" on storage.objects;
create policy "docs_select" on storage.objects for select
  using (bucket_id = 'documents' and public.is_active());

drop policy if exists "docs_insert" on storage.objects;
create policy "docs_insert" on storage.objects for insert
  with check (bucket_id = 'documents' and public.is_active());

drop policy if exists "docs_update" on storage.objects;
create policy "docs_update" on storage.objects for update
  using (bucket_id = 'documents' and public.is_active());

drop policy if exists "docs_delete_admin" on storage.objects;
create policy "docs_delete_admin" on storage.objects for delete
  using (bucket_id = 'documents' and public.is_admin());

------------------------------------------------------------------
-- project-files: alle aktive
------------------------------------------------------------------
drop policy if exists "pf_select" on storage.objects;
create policy "pf_select" on storage.objects for select
  using (bucket_id = 'project-files' and public.is_active());

drop policy if exists "pf_insert" on storage.objects;
create policy "pf_insert" on storage.objects for insert
  with check (bucket_id = 'project-files' and public.is_active());

drop policy if exists "pf_update" on storage.objects;
create policy "pf_update" on storage.objects for update
  using (bucket_id = 'project-files' and public.is_active());

drop policy if exists "pf_delete" on storage.objects;
create policy "pf_delete" on storage.objects for delete
  using (
    bucket_id = 'project-files'
    and (public.is_admin() or public.current_role() = 'prosjektleder')
  );


-- ============================================================
-- 003_installator_role.sql
-- ============================================================
-- Legg til Installatør-rolle.
-- Installatør = bemyndiget person som signerer Samsvarserklæring.
--
-- VIKTIG: Denne filen må kjøres som TO separate spørringer i Supabase
-- SQL Editor. PostgreSQL tillater ikke at en ny enum-verdi brukes i samme
-- transaksjon som den ble lagt til.
--
-- Steg 1: Kjør denne først (ALENE):
alter type user_role add value if not exists 'installator';


-- ============================================================
-- 004_installator_policies.sql
-- ============================================================
-- Steg 2: Kjør denne ETTER 003_installator_role.sql.
-- Gir Installatør samme rettigheter som Prosjektleder på prosjekter,
-- dokumenter og avvik (kan redigere alle, signere, lukke).

drop policy if exists projects_update_assigned on public.projects;
create policy projects_update_assigned on public.projects
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'prosjektleder')
      or assigned_to = auth.uid()
      or created_by = auth.uid()
    )
  );

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'prosjektleder')
      or created_by = auth.uid()
    )
  );

drop policy if exists deviations_update on public.deviations;
create policy deviations_update on public.deviations
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'prosjektleder')
      or assigned_to = auth.uid()
      or reported_by = auth.uid()
    )
  );


-- ============================================================
-- 005_app_settings.sql
-- ============================================================
-- App-innstillinger: legacy single-tenant settings.
-- I Echoo (multi-tenant) er disse feltene replikert per-organisasjon i
-- organizations-tabellen (se 039_echoo_multi_tenant.sql). app_settings
-- beholdes for bakoverkompatibilitet med eksisterende kode som leser via
-- getAppSettings() — den henter typisk én rad med id='company' og brukes
-- som fallback når org_id ikke er kjent.

create table if not exists public.app_settings (
  id text primary key default 'company',
  firma text not null default 'Bedriftsnavn',
  org_nr text,
  selskap_adresse text,
  selskap_postnr text,
  selskap_sted text,
  selskap_telefon text,
  selskap_epost text,
  installator_navn text,
  installator_tittel text,
  installator_telefon text,
  installator_epost text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

do $$ begin
  create trigger trg_app_settings_updated before update on public.app_settings
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select using (public.is_active());

drop policy if exists app_settings_update_admin on public.app_settings;
create policy app_settings_update_admin on public.app_settings
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists app_settings_insert_admin on public.app_settings;
create policy app_settings_insert_admin on public.app_settings
  for insert with check (public.is_admin());


-- ============================================================
-- 006_sja_document_kind.sql
-- ============================================================
-- Legg til SJA (Sikker Jobb Analyse) som dokumenttype.
--
-- VIKTIG: Kjør denne ALENE (PostgreSQL tillater ikke ny enum-verdi i
-- samme transaksjon som den brukes).

alter type document_kind add value if not exists 'sja';


-- ============================================================
-- 007_document_templates.sql
-- ============================================================
-- Tabell for redigerbare dokumentmaler.
-- En rad per dokumenttype. Definisjonen lagres som jsonb.
-- Hvis rad mangler: applikasjonen faller tilbake til hardkodet default.

create table if not exists public.document_templates (
  kind document_kind primary key,
  definition jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

do $$ begin
  create trigger trg_document_templates_updated before update on public.document_templates
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

------------------------------------------------------------------
-- RLS
------------------------------------------------------------------
alter table public.document_templates enable row level security;

drop policy if exists doc_templates_select on public.document_templates;
create policy doc_templates_select on public.document_templates
  for select using (public.is_active());

drop policy if exists doc_templates_admin_write on public.document_templates;
create policy doc_templates_admin_write on public.document_templates
  for all using (public.is_admin())
  with check (public.is_admin());


-- ============================================================
-- 008_cert_storage_admin.sql
-- ============================================================
-- Admin skal kunne laste opp kursbevis på vegne av enhver bruker.
-- Storage-policy må tillate at admin skriver til {profile_id}/... selv
-- når profile_id ≠ auth.uid().

drop policy if exists "cert_insert_own" on storage.objects;
create policy "cert_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );

-- Også for update — admin kan rette/erstatte filer
drop policy if exists "cert_update_own" on storage.objects;
create policy "cert_update_own" on storage.objects for update
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.is_admin()
    )
  );


-- ============================================================
-- 009_hms_document_kinds.sql
-- ============================================================
-- Legg til HMS-dokumenttyper: RUH, Startup checklist, Stikkprøvekontroll.
-- VIKTIG: Kjør hver ALTER TYPE-spørring ALENE (PostgreSQL tillater ikke
-- ny enum-verdi i samme transaksjon som den brukes).
--
-- Steg 1: Kjør disse linjene ALENE (én linje av gangen er sikrest):

alter type document_kind add value if not exists 'ruh';
alter type document_kind add value if not exists 'startup_checklist';
alter type document_kind add value if not exists 'stikkprovekontroll';


-- ============================================================
-- 010_update_opcom_address.sql
-- ============================================================
-- (No-op for Echoo) OPCOM-spesifikk adresseoppdatering fjernet.
-- I et multi-tenant Echoo-oppsett legges bedriftens adresse inn via
-- signup-flow eller /admin/innstillinger og lagres på organizations-raden.

select 1;


-- ============================================================
-- 011_cert_elevated_roles.sql
-- ============================================================
-- Utvid kompetansesenter-rettigheter:
--   Admin + Prosjektleder + Installatør kan
--   * Se alle kursbevis
--   * Laste opp på vegne av enhver bruker
--   * Slette/oppdatere alle
-- Vanlige brukere (elektriker) ser kun sine egne.

-- certificates table
drop policy if exists certificates_select on public.certificates;
create policy certificates_select on public.certificates
  for select using (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'prosjektleder')
  );

drop policy if exists certificates_insert on public.certificates;
create policy certificates_insert on public.certificates
  for insert with check (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'prosjektleder')
  );

drop policy if exists certificates_update on public.certificates;
create policy certificates_update on public.certificates
  for update using (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'prosjektleder')
  );

drop policy if exists certificates_delete on public.certificates;
create policy certificates_delete on public.certificates
  for delete using (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'prosjektleder')
  );

-- Storage policies for certificates bucket
drop policy if exists "cert_select_own" on storage.objects;
create policy "cert_select_own" on storage.objects for select
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'prosjektleder')
    )
  );

drop policy if exists "cert_insert_own" on storage.objects;
create policy "cert_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'prosjektleder')
    )
  );

drop policy if exists "cert_update_own" on storage.objects;
create policy "cert_update_own" on storage.objects for update
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'prosjektleder')
    )
  );

drop policy if exists "cert_delete_own" on storage.objects;
create policy "cert_delete_own" on storage.objects for delete
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'prosjektleder')
    )
  );


-- ============================================================
-- 012_bemyndiget_montor_roles.sql
-- ============================================================
-- Legg til Bemyndiget og Montør som roller.
-- Bemyndiget = bemyndiget person (FEL § 12) — kan signere Samsvarserklæring.
-- Montør = lærling/hjelpearbeider (mellom Elektriker og generell HMS-bruker).
--
-- VIKTIG: Kjør de to ALTER TYPE-linjene ALENE først (kan kjøres samlet,
-- men ikke i samme spørring som policy-endringene under).

alter type user_role add value if not exists 'bemyndiget';
alter type user_role add value if not exists 'montor';


-- ============================================================
-- 013_samsvar_signing_restriction.sql
-- ============================================================
-- Steg 2: Kjør etter 012_bemyndiget_montor_roles.sql.
-- Oppdaterer RLS-policies for å:
--   * Gi Bemyndiget samme rettigheter som Installatør
--   * Inkludere Montør i samme rettighetsgruppe som Elektriker
--
-- Selve signerings-restriksjon på Samsvarserklæring håndteres i
-- server-action (src/app/(app)/prosjekter/[id]/dokumenter/[kind]/actions.ts),
-- ikke i RLS, fordi det krever å sjekke kind=samsvarserklaering ved signering.

-- prosjekter — Bemyndiget kan oppdatere på lik linje med Installatør/Prosjektleder
drop policy if exists projects_update_assigned on public.projects;
create policy projects_update_assigned on public.projects
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
      or assigned_to = auth.uid()
      or created_by = auth.uid()
    )
  );

-- dokumenter
drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
      or created_by = auth.uid()
    )
  );

-- avvik
drop policy if exists deviations_update on public.deviations;
create policy deviations_update on public.deviations
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
      or assigned_to = auth.uid()
      or reported_by = auth.uid()
    )
  );

-- certificates — Bemyndiget med samme rettigheter som elevated roller
drop policy if exists certificates_select on public.certificates;
create policy certificates_select on public.certificates
  for select using (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists certificates_insert on public.certificates;
create policy certificates_insert on public.certificates
  for insert with check (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists certificates_update on public.certificates;
create policy certificates_update on public.certificates
  for update using (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists certificates_delete on public.certificates;
create policy certificates_delete on public.certificates
  for delete using (
    profile_id = auth.uid()
    or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

-- storage — certificates bucket
drop policy if exists "cert_select_own" on storage.objects;
create policy "cert_select_own" on storage.objects for select
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
    )
  );

drop policy if exists "cert_insert_own" on storage.objects;
create policy "cert_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
    )
  );

drop policy if exists "cert_update_own" on storage.objects;
create policy "cert_update_own" on storage.objects for update
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
    )
  );

drop policy if exists "cert_delete_own" on storage.objects;
create policy "cert_delete_own" on storage.objects for delete
  using (
    bucket_id = 'certificates'
    and (
      (split_part(name, '/', 1))::uuid = auth.uid()
      or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
    )
  );


-- ============================================================
-- 014_installation_type.sql
-- ============================================================
-- Type anlegg på prosjekt — styrer hvilken Samsvarserklæring-variant som brukes.

do $$ begin
  create type installation_type as enum ('bolig', 'naering', 'telecom', 'ev');
exception when duplicate_object then null; end $$;

alter table public.projects
  add column if not exists installation_type installation_type;

-- Backfill: eksisterende prosjekter får 'bolig' som default
update public.projects
set installation_type = 'bolig'
where installation_type is null;


-- ============================================================
-- 015_routines.sql
-- ============================================================
-- Rutiner-bibliotek: standard elektrosikkerhetsprosedyrer (FSE/FEK/FEL/NEK).
-- Filer lagres i 'routines' bucket. Metadata om hver rutine i denne tabellen.
-- Standard 21 norske bransje-rutiner seedes som global referansebibliotek
-- (organization_id = NULL). Hver bedrift kan også laste opp egne ekstra
-- rutiner som blir org-scopet.

------------------------------------------------------------------
-- Storage bucket
------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('routines', 'routines', false)
on conflict (id) do nothing;

drop policy if exists "routines_select_authed" on storage.objects;
create policy "routines_select_authed" on storage.objects for select
  using (bucket_id = 'routines' and public.is_active());

drop policy if exists "routines_write_admin" on storage.objects;
create policy "routines_write_admin" on storage.objects for insert
  with check (bucket_id = 'routines' and public.is_admin());

drop policy if exists "routines_update_admin" on storage.objects;
create policy "routines_update_admin" on storage.objects for update
  using (bucket_id = 'routines' and public.is_admin());

drop policy if exists "routines_delete_admin" on storage.objects;
create policy "routines_delete_admin" on storage.objects for delete
  using (bucket_id = 'routines' and public.is_admin());

------------------------------------------------------------------
-- Metadata
------------------------------------------------------------------
create table if not exists public.routines (
  id serial primary key,
  number integer,                          -- 1, 2, 3 ... for ordering
  category text,                           -- f.eks. "FSE", "FEL", "Stillingsbeskrivelser"
  title_no text not null,
  title_en text not null,
  description_no text,
  description_en text,
  file_path_en text,                       -- storage path i 'routines' bucket
  file_path_no text,                       -- storage path for norsk versjon
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create trigger trg_routines_updated before update on public.routines
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.routines enable row level security;

drop policy if exists routines_select on public.routines;
create policy routines_select on public.routines
  for select using (public.is_active());

drop policy if exists routines_admin_write on public.routines;
create policy routines_admin_write on public.routines
  for all using (public.is_admin()) with check (public.is_admin());

------------------------------------------------------------------
-- Seed med 21 standard bransje-rutiner (norske elektroforskrifter).
------------------------------------------------------------------
insert into public.routines (number, category, title_no, title_en) values
  (1, 'FSE', 'Rutiner for årlig FSE elektrosikkerhetskurs og førstehjelpsopplæring (FSE § 7)', 'Routines for the annual FSE electrical safety course and first-aid training (FSE § 7)'),
  (2, 'FEK', 'Rutiner for evaluering av kompetanse og nødvendig utdanningskvalitet (FEK § 5 og § 7 FSE)', 'Routines for evaluating the competence and the necessary quality of education in the business (FEK § 5 and § 7 FSE)'),
  (3, 'FSE', 'Rutiner for lavspenningsleder (FSE § 6 og 12)', 'Routines for Low Voltage Safety Supervisors (FSE § 6 and 12)'),
  (4, 'FSE', 'Rutiner og prosedyrer for planlegging av arbeid på lavspenningsanlegg (FSE § 10)', 'Routines and procedures for planning work in low voltage installations (FSE § 10)'),
  (5, 'FSE', 'Rutiner og prosedyrer for arbeid på spenningsløse systemer (FSE § 14 og 15)', 'Routines and procedures for working on de-energized systems (FSE § 14 and 15)'),
  (6, 'FSE', 'Rutiner og prosedyrer for arbeid under spenning (FSE § 16)', 'Routines and procedures for live working (FSE § 16)'),
  (7, 'FSE', 'Rutiner og prosedyrer for arbeid i nærheten av spenningssatte deler (FSE § 17 og 18)', 'Routines and procedures for working in the vicinity of live parts (FSE § 17 and 18)'),
  (8, 'FSE', 'Rutiner for målearbeid og bruk av måleinstrumenter (FSE § 10, 14-19)', 'Routines for measurement work and using measuring instruments (FSE § 10, 14, 15, 16, 17, 18 and 19)'),
  (9, 'FSE', 'Retningslinjer for sikkerhetsutstyr og verneutstyr (FSE § 7)', 'Guidelines for safety equipment and protective equipment (FSE § 7)'),
  (10, 'Utstyr', 'Rutiner for innkjøp og bruk av elektrisk utstyr og materiell', 'Routines for the purchase and use of electrical equipment and materials'),
  (11, 'Utstyr', 'Rutiner for bruk av elektrisk utstyr og tiltak for å forebygge elektrisk støt', 'Routines for the use of electrical equipment and measures to prevent electric shock'),
  (12, 'Utstyr', 'Rutiner for arbeid med elektrisk utstyr i spenningsatte avgrensede områder (NEK 400-7-706)', 'Routines for working with electrical equipment in energised restricted areas (NEK 400-7-706)'),
  (13, 'FEL', 'FEL § 12 — Prosedyrer for samsvarserklæring av lavspenningsanlegg', 'FEL § 12 Procedures for declaration of conformity of low voltage installations'),
  (14, 'FEL', 'FEL § 16 — Prosedyrer for risikovurdering av installasjonsarbeid i lavspenning', 'FEL § 16 Procedures for risk assessment of installation work in low voltage'),
  (15, 'FEL', 'FEL § 12 — Prosedyrer for sluttkontroll og verifikasjon av lavspenningsinstallasjoner', 'FEL § 12 Procedures for final inspection — verification of electrical installation work in low voltage'),
  (16, 'Dokumentasjon', 'Prosedyrer for utstyrsdokumentasjon, brukermanualer, kursfortegnelse og dokumentasjon av elektriske installasjoner', 'Procedures for equipment documentation, user manuals, electric circuit and documentation of electrical installations'),
  (17, 'Tilkobling', 'Rutine og prosedyre for tilkobling av forsyning til maskin levert iht. maskindirektivet', 'Routine and procedure for connecting the supply to the machine delivered acc. machinery directive'),
  (18, 'Stillinger', 'Stillingsbeskrivelse for lærlinger', 'Job description for apprentices'),
  (19, 'Stillinger', 'Stillingsbeskrivelse for hjelpearbeidere', 'Job description for aid workers'),
  (20, 'Stillinger', 'Stillingsbeskrivelse for elektrofagarbeidere', 'Job description for employee electro professionals'),
  (21, 'Produktsikkerhet', 'Rutine og instruksjoner for produkt- og forbrukertjenestesikkerhet (DSB)', 'Routine and instructions for concern for products and consumer services (DSB)')
on conflict do nothing;


-- ============================================================
-- 016_standalone_documents.sql
-- ============================================================
-- Frittstående skjemaer (uten prosjekt).
-- documents.project_id blir nullable. Elektro-dokumenter må fortsatt ha
-- prosjekt — håndheves i RLS.

alter table public.documents alter column project_id drop not null;

-- Oppdater select-policy: hvis project_id mangler, kun synlig for eier,
-- signerer, eller forhøyede roller.
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select using (
    public.is_active() and (
      project_id is not null
      or created_by = auth.uid()
      or signed_by = auth.uid()
      or public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
    )
  );

-- Insert-policy: elektro-dokumenttyper må ha project_id
drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents
  for insert with check (
    public.is_active()
    and created_by = auth.uid()
    and (
      kind not in (
        'risikovurdering',
        'sluttkontroll',
        'samsvarserklaering',
        'forenklet_sikkerhet'
      )
      or project_id is not null
    )
  );

-- Indeks for raskere oppslag av frittstående dokumenter pr. bruker
create index if not exists idx_documents_standalone
  on public.documents(created_by)
  where project_id is null;


-- ============================================================
-- 017_template_hidden.sql
-- ============================================================
-- Admin kan skjule maler de ikke vil bruke (f.eks. RUH hvis OPCOM ikke
-- trenger den dokumenttypen). Skjulte maler vises ikke i opprett-menyer,
-- men eksisterende dokumenter beholdes og kan fortsatt vises.

alter table public.document_templates
  add column if not exists is_hidden boolean not null default false;


-- ============================================================
-- 018_internkontroll_kind.sql
-- ============================================================
-- Internkontroll som dokumenttype.
-- VIKTIG: Kjør ALENE.

alter type document_kind add value if not exists 'internkontroll';


-- ============================================================
-- 019_custom_kind.sql
-- ============================================================
-- Legg til 'custom' som dokumenttype for egendefinerte maler.
-- VIKTIG: Kjør ALENE.

alter type document_kind add value if not exists 'custom';


-- ============================================================
-- 020_custom_templates.sql
-- ============================================================
-- Egendefinerte dokumentmaler — opprettes av admin via UI.
-- Dokumenter laget fra disse har kind='custom' og data._template_id = uuid.

create table if not exists public.custom_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subtitle text,
  description text,
  definition jsonb not null default '{"sections": []}'::jsonb,
  is_hidden boolean not null default false,
  ai_generated boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create trigger trg_custom_templates_updated before update on public.custom_templates
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.custom_templates enable row level security;

drop policy if exists custom_templates_select on public.custom_templates;
create policy custom_templates_select on public.custom_templates
  for select using (public.is_active());

drop policy if exists custom_templates_admin_write on public.custom_templates;
create policy custom_templates_admin_write on public.custom_templates
  for all using (public.is_admin()) with check (public.is_admin());


-- ============================================================
-- 021_opcontrol_customers.sql
-- ============================================================
-- OPControl: kunder som egen entitet (separat fra prosjekter).
-- En kunde kan ha mange sites og mange prosjekter.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_number text,
  contact_person text,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  notes text,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_name on public.customers(name);
create index if not exists idx_customers_active on public.customers(active);

do $$ begin
  create trigger trg_customers_updated before update on public.customers
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.customers enable row level security;

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select using (public.is_active());

drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
  for insert with check (public.is_active() and created_by = auth.uid());

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
      or created_by = auth.uid()
    )
  );

drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers
  for delete using (public.is_admin());


-- ============================================================
-- 022_opcontrol_sites.sql
-- ============================================================
-- OPControl: sites (fysiske lokasjoner) tilhørende kunder.
-- Brukes for telecom-installasjoner (master, basestasjoner osv.) men også
-- generelle anleggsadresser for elektroarbeid.

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  external_site_id text,        -- kundens egen Site ID (Telenor ROT741 osv.)
  name text not null,
  address text,
  postal_code text,
  city text,
  province text,
  ssb_number text,
  latitude double precision,
  longitude double precision,
  site_type text,               -- mast, basestasjon, innendørs osv.
  notes text,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sites_customer on public.sites(customer_id);
create index if not exists idx_sites_external on public.sites(external_site_id);
create index if not exists idx_sites_coords on public.sites(latitude, longitude)
  where latitude is not null and longitude is not null;

do $$ begin
  create trigger trg_sites_updated before update on public.sites
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.sites enable row level security;

drop policy if exists sites_select on public.sites;
create policy sites_select on public.sites
  for select using (public.is_active());

drop policy if exists sites_insert on public.sites;
create policy sites_insert on public.sites
  for insert with check (public.is_active() and created_by = auth.uid());

drop policy if exists sites_update on public.sites;
create policy sites_update on public.sites
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
      or created_by = auth.uid()
    )
  );

drop policy if exists sites_delete on public.sites;
create policy sites_delete on public.sites
  for delete using (public.is_admin());


-- ============================================================
-- 023_opcontrol_stages_groups.sql
-- ============================================================
-- OPControl: project_stages (kanban-kolonner) og groups (prosess-team).

create table if not exists public.project_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  order_index integer not null default 0,
  color text default '#9A9AA4',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create trigger trg_project_stages_updated before update on public.project_stages
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.project_stages enable row level security;

drop policy if exists project_stages_select on public.project_stages;
create policy project_stages_select on public.project_stages
  for select using (public.is_active());

drop policy if exists project_stages_admin_write on public.project_stages;
create policy project_stages_admin_write on public.project_stages
  for all using (public.is_admin()) with check (public.is_admin());

-- Default-kanban (kan endres av admin)
insert into public.project_stages (name, order_index, color) values
  ('Salg / Tilbud', 1, '#3B82F6'),
  ('TSSR / Befaring', 2, '#A855F7'),
  ('Planlegging', 3, '#EAB308'),
  ('Produksjon', 4, '#F47920'),
  ('As-built / Dokumentasjon', 5, '#06B6D4'),
  ('Ferdig', 6, '#10B981')
on conflict do nothing;

------------------------------------------------------------------
-- Groups: prosess-team som kan tildeles oppgaver
------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  email text,                       -- distribusjons-e-post
  description text,
  color text default '#9A9AA4',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create trigger trg_groups_updated before update on public.groups
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (group_id, user_id)
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
  for select using (public.is_active());

drop policy if exists groups_admin_write on public.groups;
create policy groups_admin_write on public.groups
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select using (public.is_active());

drop policy if exists group_members_admin_write on public.group_members;
create policy group_members_admin_write on public.group_members
  for all using (public.is_admin()) with check (public.is_admin());

-- Standardgrupper
insert into public.groups (name, description, color) values
  ('Salg', 'Salg og tilbud',           '#3B82F6'),
  ('TSSR', 'Site survey og prosjektering', '#A855F7'),
  ('Produksjon', 'Feltarbeid og installasjon', '#F47920'),
  ('ABD', 'As-Built Documentation',    '#06B6D4'),
  ('Administrasjon', 'Ledelse og support', '#9A9AA4')
on conflict (name) do nothing;


-- ============================================================
-- 024_opcontrol_project_fkeys.sql
-- ============================================================
-- OPControl: knytt prosjekter til kunder, sites og stages.
-- Eksisterende embedded customer_*-felt og site_*-felt på projects beholdes
-- som backup-data — flyttes til kunder/sites-tabellene over tid.

alter table public.projects add column if not exists customer_id uuid
  references public.customers(id) on delete set null;
alter table public.projects add column if not exists site_id uuid
  references public.sites(id) on delete set null;
alter table public.projects add column if not exists stage_id uuid
  references public.project_stages(id) on delete set null;

create index if not exists idx_projects_customer on public.projects(customer_id);
create index if not exists idx_projects_site on public.projects(site_id);
create index if not exists idx_projects_stage on public.projects(stage_id);


-- ============================================================
-- 025_customer_map_color.sql
-- ============================================================
-- OPControl: per-kunde kartfarge for marker-visualisering på /kart.
-- NULL = bruk OPCOM-oransje (#F47920) default.
-- Lagres som hex-string (#RRGGBB).

alter table public.customers
  add column if not exists map_color text;

comment on column public.customers.map_color is
  'Hex-farge (#RRGGBB) brukt for kundens sites i kartet. NULL = OPCOM-oransje.';


-- ============================================================
-- 026_project_dates.sql
-- ============================================================
-- OPControl: planlagte datoer på prosjekter for kalender-visning.
-- scheduled_start_date / scheduled_end_date er valgfri. Hvis null, viser
-- vi prosjektet basert på status/created_at i stedet.

alter table public.projects
  add column if not exists scheduled_start_date date,
  add column if not exists scheduled_end_date date;

create index if not exists idx_projects_scheduled_start
  on public.projects(scheduled_start_date)
  where scheduled_start_date is not null;

create index if not exists idx_projects_scheduled_end
  on public.projects(scheduled_end_date)
  where scheduled_end_date is not null;

comment on column public.projects.scheduled_start_date is
  'Planlagt oppstartsdato. Brukes på kalenderen.';
comment on column public.projects.scheduled_end_date is
  'Planlagt sluttdato/frist. Brukes på kalenderen.';


-- ============================================================
-- 027_project_comments.sql
-- ============================================================
-- OPControl: kommentarer/diskusjon på prosjekt-nivå.
-- Brukes for intern kommunikasjon mellom prosjektleder, montør, elektriker etc.

create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_comments_project
  on public.project_comments(project_id, created_at desc);
create index if not exists idx_project_comments_author
  on public.project_comments(author_id);

do $$ begin
  create trigger trg_project_comments_updated before update on public.project_comments
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.project_comments enable row level security;

-- Alle aktive brukere kan lese
drop policy if exists project_comments_select on public.project_comments;
create policy project_comments_select on public.project_comments
  for select using (public.is_active());

-- Alle aktive brukere kan opprette egne kommentarer
drop policy if exists project_comments_insert on public.project_comments;
create policy project_comments_insert on public.project_comments
  for insert with check (public.is_active() and author_id = auth.uid());

-- Forfatteren kan oppdatere egne kommentarer; admin kan oppdatere alle
drop policy if exists project_comments_update on public.project_comments;
create policy project_comments_update on public.project_comments
  for update using (
    public.is_active() and (author_id = auth.uid() or public.is_admin())
  );

-- Forfatteren kan slette egne kommentarer; admin kan slette alle
drop policy if exists project_comments_delete on public.project_comments;
create policy project_comments_delete on public.project_comments
  for delete using (
    public.is_active() and (author_id = auth.uid() or public.is_admin())
  );

comment on table public.project_comments is
  'Kommentarer/diskusjon på prosjekt. Brukes for intern kommunikasjon mellom rollene.';


-- ============================================================
-- 028_email_infrastructure.sql
-- ============================================================
-- OPControl: e-post-infrastruktur
-- email_log: alle utsendte e-poster med status og evt. feilmelding
-- notification_preferences: per-bruker on/off pr. varseltype

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  subject text not null,
  body_text text,
  body_html text,
  category text not null,
  -- Kategorier: 'deviation_assigned', 'comment_added', 'daily_digest', 'test', 'task_assigned'
  related_project_id uuid references public.projects(id) on delete set null,
  related_deviation_id uuid references public.deviations(id) on delete set null,
  status text not null default 'sent',
  -- Status: 'sent' eller 'failed'
  provider_message_id text,
  error text,
  sent_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_email_log_sent_at on public.email_log(sent_at desc);
create index if not exists idx_email_log_recipient on public.email_log(recipient);
create index if not exists idx_email_log_category on public.email_log(category);

alter table public.email_log enable row level security;

-- Bare admin kan se hele loggen
drop policy if exists email_log_select_admin on public.email_log;
create policy email_log_select_admin on public.email_log
  for select using (public.is_admin());

-- Alle aktive brukere kan logge sine egne sendinger (via server actions)
drop policy if exists email_log_insert on public.email_log;
create policy email_log_insert on public.email_log
  for insert with check (public.is_active());

-- Notification preferences i profiles
alter table public.profiles
  add column if not exists notify_deviation_assigned boolean not null default true,
  add column if not exists notify_comment_added boolean not null default true,
  add column if not exists notify_task_assigned boolean not null default true,
  add column if not exists notify_daily_digest boolean not null default false;

comment on table public.email_log is
  'Audit-log over alle e-poster sendt fra OPControl.';
comment on column public.profiles.notify_deviation_assigned is
  'Send e-post når et avvik tildeles meg.';
comment on column public.profiles.notify_comment_added is
  'Send e-post når noen kommenterer på et prosjekt jeg er tildelt.';
comment on column public.profiles.notify_task_assigned is
  'Send e-post når en oppgave tildeles meg.';
comment on column public.profiles.notify_daily_digest is
  'Send daglig oppsummering kl. 08:00 over alle åpne saker.';


-- ============================================================
-- 029_tasks.sql
-- ============================================================
-- OPControl: Tasks (planning-tasks, separat fra Avvik som er kvalitet-spesifikk)
-- Tasks er fritt definerte arbeidsoppgaver knyttet til prosjekt eller frittstående,
-- tildelt til individ eller gruppe, med 3-state status.

create table if not exists public.task_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_no text not null,
  label_en text not null,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.task_types (slug, label_no, label_en, order_index) values
  ('power_issue', 'Strømproblem', 'Power Issue', 10),
  ('cleanup', 'Opprydding', 'Cleanup', 20),
  ('coverage_issue', 'Dekningsproblem', 'Coverage Issue', 30),
  ('maintenance', 'Vedlikehold', 'Maintenance', 40),
  ('inspection', 'Inspeksjon', 'Inspection', 50),
  ('documentation', 'Dokumentasjon', 'Documentation', 60),
  ('coordination', 'Koordinering', 'Coordination', 70),
  ('other', 'Annet', 'Other', 100)
on conflict (slug) do nothing;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  task_type_slug text references public.task_types(slug),
  status text not null default 'initiated',
  -- Status: 'initiated', 'in_progress', 'resolved'
  assigned_to uuid references public.profiles(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  due_date date,
  reported_by uuid not null references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to) where status != 'resolved';
create index if not exists idx_tasks_group_id on public.tasks(group_id) where status != 'resolved';
create index if not exists idx_tasks_status_due on public.tasks(status, due_date);

do $$ begin
  create trigger trg_tasks_updated before update on public.tasks
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.tasks enable row level security;
alter table public.task_types enable row level security;

-- task_types: alle aktive brukere kan se; bare admin kan endre
drop policy if exists task_types_select on public.task_types;
create policy task_types_select on public.task_types
  for select using (public.is_active());

drop policy if exists task_types_admin on public.task_types;
create policy task_types_admin on public.task_types
  for all using (public.is_admin()) with check (public.is_admin());

-- tasks: alle aktive brukere kan se og opprette
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select using (public.is_active());

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert with check (public.is_active() and reported_by = auth.uid());

-- Oppdatering: oppretter, tildelt-person, admin
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update using (
    public.is_active() and (
      reported_by = auth.uid()
      or assigned_to = auth.uid()
      or public.is_admin()
    )
  );

-- Sletting: admin + oppretter
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete using (
    public.is_active() and (reported_by = auth.uid() or public.is_admin())
  );

comment on table public.tasks is
  'Planning-tasks. Frittstående eller knyttet til prosjekt. Tildelt individ eller gruppe.';
comment on column public.tasks.status is
  '''initiated'', ''in_progress'' eller ''resolved''. Brukes som kanban-kolonner.';


-- ============================================================
-- 030_project_phase.sql
-- ============================================================
-- OPControl: Phase på prosjekt — orthogonalt til Status.
-- Phase er "livssyklus-fase" mens Status er "prosess-tilstand".
-- F.eks. et prosjekt kan være status=aktiv og phase=production samtidig.

do $$ begin
  create type project_phase as enum (
    'bidding',
    'production',
    'completed',
    'lost',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

alter table public.projects
  add column if not exists phase project_phase not null default 'production';

create index if not exists idx_projects_phase on public.projects(phase);

comment on column public.projects.phase is
  'Livssyklus-fase: bidding/production/completed/lost/cancelled. Orthogonalt til status.';


-- ============================================================
-- 031_project_categories.sql
-- ============================================================
-- OPControl: prosjektkategorier med admin-definerte custom fields.
-- field_schema er en JSON-array av felter; verdier lagres i projects.category_data.

create table if not exists public.project_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  field_schema jsonb not null default '[]'::jsonb,
  -- field_schema = [
  --   { "key": "voltage", "label": "Spenning (V)", "type": "number", "required": false },
  --   { "key": "phase_count", "label": "Faser", "type": "dropdown", "options": ["1-fase", "3-fase"] },
  --   { "key": "outdoor", "label": "Utendørs?", "type": "yes_no" },
  --   { "key": "comment", "label": "Kommentar", "type": "text" }
  -- ]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_categories_active on public.project_categories(is_active, order_index);

do $$ begin
  create trigger trg_project_categories_updated before update on public.project_categories
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- Seed default kategorier matchende OPCOM-spec
insert into public.project_categories (slug, name, description, order_index) values
  ('indoor', 'Indoor', 'Innendørs anlegg (kjøpesenter, kontor, bolig)', 10),
  ('rl', 'RL', 'Radiolink (radio-link mellom master)', 20),
  ('ran', 'RAN', 'Radio Access Network (basestasjoner)', 30),
  ('battery', 'Battery', 'Batterianlegg / strømforsyning', 40),
  ('roofsafety', 'Roofsafety', 'Takfeste og fallsikring', 50)
on conflict (slug) do nothing;

-- RLS
alter table public.project_categories enable row level security;

drop policy if exists project_categories_select on public.project_categories;
create policy project_categories_select on public.project_categories
  for select using (public.is_active());

drop policy if exists project_categories_admin on public.project_categories;
create policy project_categories_admin on public.project_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- Knytting på prosjekt + custom field-data
alter table public.projects
  add column if not exists category_id uuid references public.project_categories(id) on delete set null,
  add column if not exists category_data jsonb not null default '{}'::jsonb;

create index if not exists idx_projects_category on public.projects(category_id);

comment on column public.projects.category_id is
  'Hvilken kategori prosjektet tilhører. Bestemmer custom fields som vises.';
comment on column public.projects.category_data is
  'Verdier for kategoriens custom fields (key/value JSON).';


-- ============================================================
-- 032_project_templates.sql
-- ============================================================
-- OPControl: Prosjekt-maler — forhåndsutfylte starting points for nye prosjekter.
-- Admin definerer maler; ved opprettelse av nytt prosjekt kan bruker velge
-- "Start fra mal" som forhåndsfyller en gruppe felter.

create table if not exists public.project_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_category_id uuid references public.project_categories(id) on delete set null,
  default_phase project_phase,
  default_installation_type text,
  -- 'bolig' | 'naering' | 'telecom' | 'ev'
  default_description text,
  default_assigned_to uuid references public.profiles(id) on delete set null,
  default_stage_id uuid references public.project_stages(id) on delete set null,
  default_category_data jsonb not null default '{}'::jsonb,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_templates_active
  on public.project_templates(is_active, order_index);

do $$ begin
  create trigger trg_project_templates_updated before update on public.project_templates
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.project_templates enable row level security;

drop policy if exists project_templates_select on public.project_templates;
create policy project_templates_select on public.project_templates
  for select using (public.is_active());

drop policy if exists project_templates_admin on public.project_templates;
create policy project_templates_admin on public.project_templates
  for all using (public.is_admin()) with check (public.is_admin());

comment on table public.project_templates is
  'Forhåndsutfylte starting points for nye prosjekter. Admin-administrert.';


-- ============================================================
-- 033_get_my_open_counts.sql
-- ============================================================
-- OPControl: én RPC for "Mine oppgaver"-badge istedenfor 3 separate counts.
-- Kalt fra MyTasksBadge hver 60 sek + ved Realtime-events.
-- security definer: kjøres med eier-rettigheter, men begrenser til auth.uid().

create or replace function public.get_my_open_counts()
returns table (
  tasks_count integer,
  deviations_count integer,
  certs_expiring_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    return query select 0, 0, 0;
    return;
  end if;

  return query
  select
    (select count(*)::integer
       from public.tasks
       where assigned_to = uid and status <> 'resolved'),
    (select count(*)::integer
       from public.deviations
       where assigned_to = uid and status <> 'lukket'),
    (select count(*)::integer
       from public.certificates
       where profile_id = uid
         and expires_date is not null
         and expires_date <= (now() + interval '90 days')::date);
end;
$$;

grant execute on function public.get_my_open_counts() to authenticated;

comment on function public.get_my_open_counts() is
  'Returnerer åpne saker for innlogget bruker. Brukes av sidebar-badge.';


-- ============================================================
-- 034_stoffkartotek.sql
-- ============================================================
-- OPControl: Stoffkartotek — HMS-lovpålagt oversikt over kjemiske stoffer
-- med sikkerhetsdatablader (SDS), GHS-fareklasser og verneutstyr.

create table if not exists public.substances (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Norsk handelsnavn
  manufacturer text,
  -- Produsent/leverandør
  cas_number text,
  -- CAS-registreringsnr. (kjemisk identifikator)
  usage_area text,
  -- Hvor det brukes (f.eks. "Verksted", "På bil", "Lager")
  storage_location text,
  -- Hvor det lagres
  ghs_pictograms text[] not null default '{}',
  -- Array av GHS-koder: GHS01..GHS09
  hazard_statements text,
  -- H-statements som fritekst eller komma-separert
  precautionary_measures text,
  -- Vernetiltak (verneutstyr, ventilasjon osv.)
  sds_file_path text,
  -- Storage-path til sikkerhetsdatablad PDF
  sds_revision_date date,
  -- Når SDS sist ble revidert av produsenten
  quantity_estimate text,
  -- F.eks. "5 liter", "2 spray-bokser"
  notes text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_substances_active on public.substances(active);
create index if not exists idx_substances_name on public.substances(name);

do $$ begin
  create trigger trg_substances_updated before update on public.substances
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.substances enable row level security;

drop policy if exists substances_select on public.substances;
create policy substances_select on public.substances
  for select using (public.is_active());

drop policy if exists substances_insert on public.substances;
create policy substances_insert on public.substances
  for insert with check (
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists substances_update on public.substances;
create policy substances_update on public.substances
  for update using (
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists substances_delete on public.substances;
create policy substances_delete on public.substances
  for delete using (public.is_admin());

-- Storage bucket for SDS-PDF-er. Privat (krever signed URL).
insert into storage.buckets (id, name, public)
values ('substance-sds', 'substance-sds', false)
on conflict (id) do nothing;

-- Alle aktive brukere kan lese SDS-filer
drop policy if exists "substance_sds_select" on storage.objects;
create policy "substance_sds_select" on storage.objects
  for select using (
    bucket_id = 'substance-sds' and public.is_active()
  );

-- Privileged roller kan laste opp / oppdatere / slette
drop policy if exists "substance_sds_insert" on storage.objects;
create policy "substance_sds_insert" on storage.objects
  for insert with check (
    bucket_id = 'substance-sds' and
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists "substance_sds_update" on storage.objects;
create policy "substance_sds_update" on storage.objects
  for update using (
    bucket_id = 'substance-sds' and
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists "substance_sds_delete" on storage.objects;
create policy "substance_sds_delete" on storage.objects
  for delete using (
    bucket_id = 'substance-sds' and public.is_admin()
  );

comment on table public.substances is
  'Stoffkartotek (HMS-lovpålagt) over kjemiske stoffer i bruk.';


-- ============================================================
-- 035_production_schedule.sql
-- ============================================================
-- OPControl: Produksjonsplan (Gantt) — planlagte arbeidsoppdrag med
-- team-tilhørighet og periode. Off-perioder (ferie/sykdom/helligdag) er
-- egen tabell som vises som stripete overlegg.

create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  title text,
  -- valgfri override; ellers vises project.title
  start_date date not null,
  end_date date not null,
  status text not null default 'planned',
  -- 'planned' | 'in_progress' | 'done' | 'revisit'
  locked boolean not null default false,
  locked_reason text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_dates_valid check (end_date >= start_date)
);

create index if not exists idx_schedule_dates on public.schedule_entries(start_date, end_date);
create index if not exists idx_schedule_group on public.schedule_entries(group_id);
create index if not exists idx_schedule_project on public.schedule_entries(project_id);

do $$ begin
  create trigger trg_schedule_updated before update on public.schedule_entries
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

create table if not exists public.schedule_off_periods (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  -- null group_id = gjelder alle team (f.eks. nasjonal helligdag)
  start_date date not null,
  end_date date not null,
  reason text not null default 'vacation',
  -- 'vacation' | 'sick' | 'holiday' | 'other'
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint off_dates_valid check (end_date >= start_date)
);

create index if not exists idx_off_dates on public.schedule_off_periods(start_date, end_date);
create index if not exists idx_off_group on public.schedule_off_periods(group_id);

alter table public.schedule_entries enable row level security;
alter table public.schedule_off_periods enable row level security;

-- Alle aktive brukere kan se planen
drop policy if exists schedule_entries_select on public.schedule_entries;
create policy schedule_entries_select on public.schedule_entries
  for select using (public.is_active());

drop policy if exists schedule_off_select on public.schedule_off_periods;
create policy schedule_off_select on public.schedule_off_periods
  for select using (public.is_active());

-- Admin + prosjektleder + installator + bemyndiget kan redigere
drop policy if exists schedule_entries_write on public.schedule_entries;
create policy schedule_entries_write on public.schedule_entries
  for all using (
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  ) with check (
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists schedule_off_write on public.schedule_off_periods;
create policy schedule_off_write on public.schedule_off_periods
  for all using (
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  ) with check (
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

comment on table public.schedule_entries is
  'Produksjonsplan: planlagte arbeidsoppdrag i tidsperioder, tildelt team/gruppe.';
comment on table public.schedule_off_periods is
  'Off-perioder (ferie/sykdom/helligdag) som vises som overlegg på kalenderen.';


-- ============================================================
-- 036_off_periods_lock.sql
-- ============================================================
-- Lås på off-perioder (samme pattern som schedule_entries)
-- Låste perioder kan ikke flyttes eller endres uten å låses opp først.

alter table public.schedule_off_periods
  add column if not exists locked boolean not null default false,
  add column if not exists locked_reason text;

comment on column public.schedule_off_periods.locked is
  'Lås for å hindre at perioden flyttes/redigeres. Krever locked_reason når låst.';


-- ============================================================
-- 037_issue_reports.sql
-- ============================================================
-- 037_issue_reports.sql
-- Issue/bug-reporter tilgjengelig fra Report Issue-knappen i AppShell.
-- Alle aktive brukere kan rapportere. Bare admin kan lese og oppdatere.

do $$ begin
  create type issue_severity as enum ('lav', 'middels', 'hoey');
exception when duplicate_object then null; end $$;

do $$ begin
  create type issue_status as enum ('apen', 'under_arbeid', 'lukket');
exception when duplicate_object then null; end $$;

create table if not exists public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  -- Nullable så ON DELETE SET NULL ikke krasjer hvis bruker slettes.
  -- Rapporten beholdes for audit-historikk, men reporter blir anonym.
  reported_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  severity issue_severity not null default 'middels',
  status issue_status not null default 'apen',
  page_url text,
  user_agent text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_issue_reports_status on public.issue_reports(status);
create index if not exists idx_issue_reports_reported_by on public.issue_reports(reported_by);
create index if not exists idx_issue_reports_created on public.issue_reports(created_at desc);

do $$ begin
  create trigger trg_issue_reports_updated before update on public.issue_reports
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.issue_reports enable row level security;

-- Alle aktive brukere kan rapportere
drop policy if exists issue_reports_insert on public.issue_reports;
create policy issue_reports_insert on public.issue_reports
  for insert with check (public.is_active() and reported_by = auth.uid());

-- Brukere ser sine egne rapporter; admin ser alle
drop policy if exists issue_reports_select on public.issue_reports;
create policy issue_reports_select on public.issue_reports
  for select using (reported_by = auth.uid() or public.is_admin());

-- Bare admin oppdaterer/lukker
drop policy if exists issue_reports_update_admin on public.issue_reports;
create policy issue_reports_update_admin on public.issue_reports
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists issue_reports_delete_admin on public.issue_reports;
create policy issue_reports_delete_admin on public.issue_reports
  for delete using (public.is_admin());


-- ============================================================
-- 038_gantt_sections.sql
-- ============================================================
-- 038_gantt_sections.sql
-- Project-seksjoner i produksjonsplan-Gantt: gruppér team-lanes under
-- en valgfri seksjons-overskrift (f.eks. "BID12 Bergen"). Admin styrer
-- både rekkefølge på seksjoner og rekkefølge på team innen seksjon.

create table if not exists public.gantt_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gantt_sections_order on public.gantt_sections(sort_order);

do $$ begin
  create trigger trg_gantt_sections_updated before update on public.gantt_sections
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.groups
  add column if not exists gantt_section_id uuid
    references public.gantt_sections(id) on delete set null;

alter table public.groups
  add column if not exists gantt_sort_order integer not null default 0;

create index if not exists idx_groups_gantt_section on public.groups(gantt_section_id, gantt_sort_order);

alter table public.gantt_sections enable row level security;

drop policy if exists gantt_sections_select on public.gantt_sections;
create policy gantt_sections_select on public.gantt_sections
  for select using (public.is_active());

drop policy if exists gantt_sections_insert_admin on public.gantt_sections;
create policy gantt_sections_insert_admin on public.gantt_sections
  for insert with check (public.is_admin());

drop policy if exists gantt_sections_update_admin on public.gantt_sections;
create policy gantt_sections_update_admin on public.gantt_sections
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists gantt_sections_delete_admin on public.gantt_sections;
create policy gantt_sections_delete_admin on public.gantt_sections
  for delete using (public.is_admin());


-- ============================================================
-- 039_echoo_multi_tenant.sql
-- ============================================================
-- 039_echoo_multi_tenant.sql
-- Echoo: gjør hele systemet multi-tenant.
--
-- Sikkerhetsmodell:
-- - Alle data-tabeller scopes til auth-brukerens organisasjon via RLS.
-- - Eldre policies (fra migrations 001-038) DROPPES før org-isolation
--   skapes, slik at gamle permissive policies ikke kan bypasse isolation
--   via OR-kombinasjon.
-- - signup_organization-funksjonen er kun kjørbar med service_role
--   (server actions), aldri direkte av brukere.

------------------------------------------------------------------
-- Fix bug i 037: reported_by var NOT NULL + ON DELETE SET NULL
------------------------------------------------------------------
do $$ begin
  alter table public.issue_reports alter column reported_by drop not null;
exception when others then null; end $$;

------------------------------------------------------------------
-- organizations
------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  firma text not null,
  org_nr text,
  selskap_adresse text,
  selskap_postnr text,
  selskap_sted text,
  selskap_telefon text,
  selskap_epost text,
  installator_navn text,
  installator_tittel text,
  installator_telefon text,
  installator_epost text,
  logo_url text,
  primary_color text default '#F47920',
  industry text default 'elektro',
  employee_count_est integer,
  plan text default 'beta',
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_organizations_firma on public.organizations(firma);

do $$ begin
  create trigger trg_organizations_updated before update on public.organizations
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

------------------------------------------------------------------
-- Knytt brukere til organisasjon
------------------------------------------------------------------
alter table public.profiles
  add column if not exists organization_id uuid
    references public.organizations(id) on delete cascade;

create index if not exists idx_profiles_org on public.profiles(organization_id);

------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------
create or replace function public.current_organization_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

------------------------------------------------------------------
-- Legg organization_id på alle data-tabeller
------------------------------------------------------------------
do $$
declare
  tbl text;
  org_tables text[] := array[
    'projects', 'customers', 'sites', 'documents', 'deviations',
    'certificates', 'tasks', 'task_types', 'groups',
    'gantt_sections', 'schedule_entries', 'schedule_off_periods',
    'substances', 'email_log', 'audit_log',
    'project_categories', 'project_templates', 'project_stages',
    'document_templates', 'routines', 'issue_reports',
    'custom_templates'
  ];
begin
  foreach tbl in array org_tables loop
    if to_regclass('public.' || tbl) is not null then
      execute format('alter table public.%I add column if not exists organization_id uuid references public.organizations(id) on delete cascade', tbl);
      execute format('create index if not exists idx_%I_org on public.%I(organization_id)', tbl, tbl);
    end if;
  end loop;
end $$;

------------------------------------------------------------------
-- CLEAN SLATE + org-isolation RLS for hver data-tabell.
-- Dropper ALLE eksisterende policies så ingen gammel permissiv policy
-- kan OR-bypasse isolation. Bygger så en enkelt for all-policy som
-- krever match på organization_id.
------------------------------------------------------------------
do $$
declare
  tbl text;
  pol_name text;
  org_tables text[] := array[
    'projects', 'customers', 'sites', 'documents', 'deviations',
    'certificates', 'tasks', 'task_types', 'groups',
    'gantt_sections', 'schedule_entries', 'schedule_off_periods',
    'substances', 'email_log', 'audit_log',
    'project_categories', 'project_templates', 'project_stages',
    'document_templates', 'issue_reports', 'custom_templates'
  ];
begin
  foreach tbl in array org_tables loop
    if to_regclass('public.' || tbl) is not null then
      -- Drop alle eksisterende policies på denne tabellen
      for pol_name in
        select policyname from pg_policies
        where schemaname = 'public' and tablename = tbl
      loop
        execute format('drop policy %I on public.%I', pol_name, tbl);
      end loop;

      -- Org-isolation: én enkel ALL-policy, kun authenticated brukere
      execute format($q$
        create policy %I_org_isolation on public.%I
          for all
          to authenticated
          using (organization_id = (select public.current_organization_id()))
          with check (organization_id = (select public.current_organization_id()))
      $q$, tbl, tbl);
    end if;
  end loop;
end $$;

------------------------------------------------------------------
-- profiles: drop alle gamle, opprett org-scopede policies
------------------------------------------------------------------
do $$
declare pol_name text;
begin
  for pol_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy %I on public.profiles', pol_name);
  end loop;
end $$;

create policy profiles_select on public.profiles
  for select to authenticated
  using (organization_id = (select public.current_organization_id()));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and organization_id = (select public.current_organization_id()));

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (
    public.is_admin()
    and organization_id = (select public.current_organization_id())
  )
  with check (organization_id = (select public.current_organization_id()));

create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (
    public.is_admin()
    and organization_id = (select public.current_organization_id())
  );

------------------------------------------------------------------
-- Routines: spesialregel — global referansebibliotek (org_id NULL)
-- synlig for alle aktive; org-spesifikke kun innen org.
------------------------------------------------------------------
do $$
declare pol_name text;
begin
  for pol_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'routines'
  loop
    execute format('drop policy %I on public.routines', pol_name);
  end loop;
end $$;

create policy routines_select on public.routines
  for select to authenticated
  using (
    organization_id is null
    or organization_id = (select public.current_organization_id())
  );

create policy routines_insert_admin on public.routines
  for insert to authenticated
  with check (
    public.is_admin()
    and organization_id = (select public.current_organization_id())
  );

create policy routines_update_admin on public.routines
  for update to authenticated
  using (
    public.is_admin()
    and organization_id = (select public.current_organization_id())
  )
  with check (organization_id = (select public.current_organization_id()));

create policy routines_delete_admin on public.routines
  for delete to authenticated
  using (
    public.is_admin()
    and organization_id = (select public.current_organization_id())
  );

------------------------------------------------------------------
-- group_members: arver org via group_id → groups.organization_id
------------------------------------------------------------------
do $$
declare pol_name text;
begin
  for pol_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'group_members'
  loop
    execute format('drop policy %I on public.group_members', pol_name);
  end loop;
end $$;

create policy group_members_org_isolation on public.group_members
  for all to authenticated
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_id
        and g.organization_id = (select public.current_organization_id())
    )
  )
  with check (
    exists (
      select 1 from public.groups g
      where g.id = group_id
        and g.organization_id = (select public.current_organization_id())
    )
  );

------------------------------------------------------------------
-- organizations RLS
------------------------------------------------------------------
alter table public.organizations enable row level security;

drop policy if exists organizations_select_own on public.organizations;
create policy organizations_select_own on public.organizations
  for select to authenticated
  using (id = (select public.current_organization_id()));

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations
  for update to authenticated
  using (
    id = (select public.current_organization_id()) and public.is_admin()
  )
  with check (id = (select public.current_organization_id()));

-- INSERT på organizations skjer via signup_organization()
-- security definer function, aldri direkte fra app-RLS.

------------------------------------------------------------------
-- Signup-helper.
--
-- SIKKERHET: Funksjonen kjøres kun med service_role, fra server actions
-- som har gjort den faktiske auth.signUp og kjenner det ekte user_id-et.
-- Brukere kan ikke kalle dette direkte og dermed ikke promotere
-- vilkårlige andre user_id-er til admin.
------------------------------------------------------------------
create or replace function public.signup_organization(
  p_user_id uuid,
  p_firma text,
  p_org_nr text default null,
  p_employee_count integer default null,
  p_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if p_user_id is null or p_firma is null or length(trim(p_firma)) = 0 then
    raise exception 'user_id and firma required';
  end if;

  insert into public.organizations (firma, org_nr, employee_count_est, trial_ends_at)
  values (
    trim(p_firma),
    nullif(trim(coalesce(p_org_nr, '')), ''),
    p_employee_count,
    now() + interval '14 days'
  )
  returning id into v_org_id;

  insert into public.profiles (id, email, full_name, role, organization_id, active)
  select p_user_id, u.email, coalesce(p_full_name, u.raw_user_meta_data->>'full_name'),
         'admin', v_org_id, true
  from auth.users u
  where u.id = p_user_id
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    role = 'admin',
    active = true,
    full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return v_org_id;
end $$;

-- KRITISK: kun service_role får kalle dette. Anon og authenticated har
-- ikke tilgang, så ingen bruker kan promotere seg selv eller andre.
revoke execute on function public.signup_organization(uuid, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.signup_organization(uuid, text, text, integer, text)
  to service_role;

------------------------------------------------------------------
-- Storage: org-logos bucket
-- Bucket er public (logoer er offentlige) men vi krever fortsatt at
-- INSERT/UPDATE/DELETE kun gjelder admin på egen org sin folder.
-- SELECT via API begrenses til egen org for å forhindre at en bruker
-- enumererer andre orgs sine logo-stier.
------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

drop policy if exists org_logos_select on storage.objects;
create policy org_logos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] = (select public.current_organization_id())::text
  );

drop policy if exists org_logos_admin_write on storage.objects;
create policy org_logos_admin_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] = (select public.current_organization_id())::text
    and public.is_admin()
  )
  with check (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] = (select public.current_organization_id())::text
    and public.is_admin()
  );

