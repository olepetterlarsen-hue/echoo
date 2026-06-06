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
