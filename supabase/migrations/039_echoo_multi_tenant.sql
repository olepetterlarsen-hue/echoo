-- 039_echoo_multi_tenant.sql
-- Echoo: gjør hele systemet multi-tenant. Hver bedrift som signer opp
-- får en egen organisasjon. Alle data-tabeller scopes på organization_id
-- via RLS. Brukere tilhører nøyaktig én org.

------------------------------------------------------------------
-- organizations
------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  -- Bedrifts-info (overstyrer placeholder-COMPANY i koden)
  firma text not null,
  org_nr text,
  selskap_adresse text,
  selskap_postnr text,
  selskap_sted text,
  selskap_telefon text,
  selskap_epost text,
  -- Installatør-info (vises på Samsvarserklæring)
  installator_navn text,
  installator_tittel text,
  installator_telefon text,
  installator_epost text,
  -- Branding
  logo_url text,
  primary_color text default '#F47920',
  -- Meta
  industry text default 'elektro',     -- åpner for andre fag senere
  employee_count_est integer,           -- fra signup
  plan text default 'beta',             -- 'beta' | 'starter' | 'pro' osv.
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
-- Helper: gjeldende brukers organisasjon
------------------------------------------------------------------
create or replace function public.current_organization_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

------------------------------------------------------------------
-- Org-scope alle data-tabeller
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
    'document_templates', 'routines', 'issue_reports'
  ];
begin
  foreach tbl in array org_tables loop
    -- Skip hvis tabellen ikke finnes
    if to_regclass('public.' || tbl) is not null then
      execute format('alter table public.%I add column if not exists organization_id uuid references public.organizations(id) on delete cascade', tbl);
      execute format('create index if not exists idx_%I_org on public.%I(organization_id)', tbl, tbl);
    end if;
  end loop;
end $$;

-- group_members har ikke direkte org_id; det er en join-tabell.
-- Group_members arver via group_id → organization_id.

------------------------------------------------------------------
-- RLS-policies: alle data-tabeller scopes til current_organization_id()
------------------------------------------------------------------
-- profiles: bare se andre i samme org
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    organization_id = public.current_organization_id()
  );

-- Ny user kan bli opprettet uten org_id (settes av signup-action eller invite)
drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert with check (
    public.is_admin() and (
      organization_id = public.current_organization_id()
      or organization_id is null
    )
  );

-- Org-scopet policy-rewrite for hver tabell
do $$
declare
  tbl text;
  org_tables text[] := array[
    'projects', 'customers', 'sites', 'documents', 'deviations',
    'certificates', 'tasks', 'task_types', 'groups',
    'gantt_sections', 'schedule_entries', 'schedule_off_periods',
    'substances', 'email_log', 'audit_log',
    'project_categories', 'project_templates', 'project_stages',
    'document_templates', 'routines', 'issue_reports'
  ];
begin
  foreach tbl in array org_tables loop
    if to_regclass('public.' || tbl) is not null then
      -- Slett alle eksisterende policies på tabellen og skap én enkel
      -- org-scopet ALL-policy. Senere kan vi gjøre mer nyansert per-rolle
      -- styring som overlay.
      execute format('drop policy if exists %I_org_isolation on public.%I', tbl, tbl);
      execute format($q$
        create policy %I_org_isolation on public.%I
          for all
          using (organization_id = public.current_organization_id())
          with check (organization_id = public.current_organization_id())
      $q$, tbl, tbl);
    end if;
  end loop;
end $$;

-- Routines: spesialregel — global referansebibliotek (org_id NULL) er synlig
-- for alle aktive brukere; org-spesifikke rutiner er kun synlige innen org.
drop policy if exists routines_org_isolation on public.routines;
create policy routines_select on public.routines
  for select using (
    public.is_active() and (
      organization_id is null
      or organization_id = public.current_organization_id()
    )
  );
drop policy if exists routines_insert_admin on public.routines;
create policy routines_insert_admin on public.routines
  for insert with check (
    public.is_admin()
    and organization_id = public.current_organization_id()
  );
drop policy if exists routines_update_admin on public.routines;
create policy routines_update_admin on public.routines
  for update using (
    public.is_admin()
    and organization_id = public.current_organization_id()
  ) with check (
    organization_id = public.current_organization_id()
  );
drop policy if exists routines_delete_admin on public.routines;
create policy routines_delete_admin on public.routines
  for delete using (
    public.is_admin()
    and organization_id = public.current_organization_id()
  );

-- group_members: arver via group_id → org
drop policy if exists group_members_org_isolation on public.group_members;
create policy group_members_org_isolation on public.group_members
  for all
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_id
        and g.organization_id = public.current_organization_id()
    )
  )
  with check (
    exists (
      select 1 from public.groups g
      where g.id = group_id
        and g.organization_id = public.current_organization_id()
    )
  );

------------------------------------------------------------------
-- organizations: select kun egen, insert ved signup (security definer
-- function brukes), update kun admin i egen org.
------------------------------------------------------------------
alter table public.organizations enable row level security;

drop policy if exists organizations_select_own on public.organizations;
create policy organizations_select_own on public.organizations
  for select using (id = public.current_organization_id());

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations
  for update using (
    id = public.current_organization_id() and public.is_admin()
  )
  with check (id = public.current_organization_id());

-- INSERT på organizations er ikke tillatt direkte fra app-RLS — det skjer
-- via signup_organization() security definer function under.

------------------------------------------------------------------
-- Signup-helper: oppretter ny org + tilknytter eksisterende auth-bruker
-- som admin. Kalles fra server action /signup-flowen etter at
-- supabase.auth.signUp har returnert user.id.
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

  -- Opprett organisasjon
  insert into public.organizations (firma, org_nr, employee_count_est, trial_ends_at)
  values (
    trim(p_firma),
    nullif(trim(coalesce(p_org_nr, '')), ''),
    p_employee_count,
    now() + interval '14 days'
  )
  returning id into v_org_id;

  -- Upsert profile som admin tilknyttet org
  insert into public.profiles (id, email, full_name, role, organization_id, active)
  select p_user_id, u.email, coalesce(p_full_name, u.raw_user_meta_data->>'full_name'), 'admin', v_org_id, true
  from auth.users u
  where u.id = p_user_id
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    role = 'admin',
    active = true,
    full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return v_org_id;
end $$;

grant execute on function public.signup_organization(uuid, text, text, integer, text) to authenticated, anon;

------------------------------------------------------------------
-- Storage: per-org logo-bucket
------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

-- Logo uploads scopes per org-id (path prefix = org_id/)
drop policy if exists org_logos_select on storage.objects;
create policy org_logos_select on storage.objects
  for select using (
    bucket_id = 'org-logos'
  );

drop policy if exists org_logos_admin_write on storage.objects;
create policy org_logos_admin_write on storage.objects
  for all
  using (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.is_admin()
  )
  with check (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.is_admin()
  );
