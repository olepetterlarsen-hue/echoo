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
