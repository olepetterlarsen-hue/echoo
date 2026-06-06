-- Echoo: post-migration verifiseringssjekk
-- Kjør i Supabase SQL Editor. Alle rader skal returnere status='OK'.

with checks as (

  -- 1. Organizations-tabell finnes
  select 'organizations table' as check_name,
    case when to_regclass('public.organizations') is not null then 'OK' else 'MISSING' end as status,
    null::text as detail

  union all
  -- 2. profiles har organization_id-kolonne
  select 'profiles.organization_id column',
    case when exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='organization_id'
    ) then 'OK' else 'MISSING' end,
    null

  union all
  -- 3. current_organization_id() helper-funksjon
  select 'current_organization_id() function',
    case when exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='current_organization_id'
    ) then 'OK' else 'MISSING' end,
    null

  union all
  -- 4. signup_organization() finnes
  select 'signup_organization() function',
    case when exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='signup_organization'
    ) then 'OK' else 'MISSING' end,
    null

  union all
  -- 5. signup_organization er KUN tilgjengelig for service_role
  select 'signup_organization is service_role only',
    case when not exists (
      select 1 from information_schema.routine_privileges
      where routine_schema='public'
        and routine_name='signup_organization'
        and grantee in ('anon', 'authenticated', 'PUBLIC')
    ) then 'OK' else 'INSECURE — anon/authenticated har execute!' end,
    coalesce((
      select string_agg(grantee, ', ')
      from information_schema.routine_privileges
      where routine_schema='public' and routine_name='signup_organization'
    ), '(none)')

  union all
  -- 6. Antall org-isolation policies (forventer ~21 stykk)
  select 'org_isolation policies count',
    case when (select count(*) from pg_policies
               where schemaname='public' and policyname like '%_org_isolation') >= 15
         then 'OK' else 'TOO FEW' end,
    (select count(*)::text from pg_policies
     where schemaname='public' and policyname like '%_org_isolation')

  union all
  -- 7. Ingen overlappende gamle policies som kan bypasse isolation
  -- (sjekker projects som representativ — bør kun ha projects_org_isolation)
  select 'projects table: only org_isolation policy',
    case when (
      select count(*) from pg_policies
      where schemaname='public' and tablename='projects'
    ) = 1 then 'OK' else 'WARNING: flere policies' end,
    (select string_agg(policyname, ', ')
     from pg_policies where schemaname='public' and tablename='projects')

  union all
  -- 8. org-logos storage bucket
  select 'org-logos storage bucket',
    case when exists (select 1 from storage.buckets where id='org-logos')
         then 'OK' else 'MISSING' end,
    null

  union all
  -- 9. issue_reports.reported_by er nullable (fix for ON DELETE SET NULL)
  select 'issue_reports.reported_by is nullable',
    case when exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='issue_reports'
        and column_name='reported_by' and is_nullable='YES'
    ) then 'OK' else 'STILL NOT NULL — kontradiksjon med ON DELETE SET NULL' end,
    null

  union all
  -- 10. Routines policies (bør ha select + insert/update/delete admin)
  select 'routines policies setup',
    case when (
      select count(*) from pg_policies
      where schemaname='public' and tablename='routines'
        and policyname in ('routines_select','routines_insert_admin','routines_update_admin','routines_delete_admin')
    ) = 4 then 'OK' else 'PARTIAL' end,
    (select count(*)::text from pg_policies
     where schemaname='public' and tablename='routines')
)
select check_name, status, detail from checks order by
  case status when 'OK' then 2 else 1 end,
  check_name;
