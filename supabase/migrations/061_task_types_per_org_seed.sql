-- 061_task_types_per_org_seed.sql
-- Migration 029 seedet task_types globalt (organization_id = NULL).
-- Migration 039 la til organization_id og en policy som krever
-- organization_id = current_organization_id(). Resultat: nye orgs ser
-- ingen task_types, og /oppgaver/ny viser tom dropdown.
--
-- Fix: seed default-typene for hver eksisterende org, og pakk seed-logikken
-- i en funksjon som signup_organization() kaller for hver ny org.

-- 1. Rydd ut alle gamle global-rader (organization_id IS NULL) FØR vi
-- legger til per-org-unique-constraint, så vi ikke får (NULL, slug)-duplikater.
delete from public.task_types where organization_id is null;

-- 2. Drop gammel global unique på task_types.slug med CASCADE.
-- CASCADE fjerner også den avhengige FK-en tasks.task_type_slug →
-- task_types.slug. Den FK-en er ikke lenger gyldig design siden slug
-- nå er unik per (org, slug). Eventuell rebygging som FK mot task_types.id
-- kan tas i en senere migrasjon.
do $$
declare
  c text;
begin
  for c in
    select conname from pg_constraint pc
    where conrelid = 'public.task_types'::regclass
      and contype = 'u'
      and (
        select array_agg(attname::text order by attnum) from pg_attribute
        where attrelid = pc.conrelid and attnum = any(pc.conkey)
      ) = array['slug']::text[]
  loop
    execute format(
      'alter table public.task_types drop constraint %I cascade', c
    );
  end loop;

  for c in
    select indexname from pg_indexes
    where tablename = 'task_types'
      and schemaname = 'public'
      and indexdef ilike '%create unique index%(slug)%'
  loop
    execute format('drop index public.%I cascade', c);
  end loop;
end $$;

-- 3. Sørg for at vi har riktig unique på (organization_id, slug).
-- Bruker IF NOT EXISTS så det er trygt om 040 allerede laget den.
create unique index if not exists task_types_org_slug_key
  on public.task_types(organization_id, slug);

-- 4. Seed-funksjon — brukes for både backfill og fremtidige signups.
create or replace function public.seed_default_task_types_for_org(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_types
    (organization_id, slug, label_no, label_en, order_index, is_active)
  values
    (p_org_id, 'power_issue',     'Strømproblem',     'Power Issue',    10, true),
    (p_org_id, 'cleanup',         'Opprydding',       'Cleanup',        20, true),
    (p_org_id, 'coverage_issue',  'Dekningsproblem',  'Coverage Issue', 30, true),
    (p_org_id, 'maintenance',     'Vedlikehold',      'Maintenance',    40, true),
    (p_org_id, 'inspection',      'Inspeksjon',       'Inspection',     50, true),
    (p_org_id, 'documentation',   'Dokumentasjon',    'Documentation',  60, true),
    (p_org_id, 'coordination',    'Koordinering',     'Coordination',   70, true),
    (p_org_id, 'other',           'Annet',            'Other',         100, true)
  on conflict (organization_id, slug) do nothing;
end $$;

-- 5. Backfill: seed for alle eksisterende orgs som mangler task_types.
do $$
declare
  org_row record;
begin
  for org_row in select id from public.organizations loop
    perform public.seed_default_task_types_for_org(org_row.id);
  end loop;
end $$;

-- 6. Koble seed inn i signup_organization for fremtidige orgs.
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

  -- Seed default-data for ny org
  perform public.seed_default_task_types_for_org(v_org_id);

  return v_org_id;
end $$;

revoke execute on function public.signup_organization(uuid, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.signup_organization(uuid, text, text, integer, text)
  to service_role;
