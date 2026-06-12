-- 040_org_insert_defaults.sql
-- Sikrer at organization_id alltid settes på insert i org-scopede tabeller,
-- selv om server action glemmer å sende den. RLS i 039 har
-- "with check (organization_id = current_organization_id())" — uten denne
-- triggeren feiler enhver insert som mangler kolonnen.
--
-- Ekstra: 039 glemte project_comments. Vi org-isolerer den her også.

------------------------------------------------------------------
-- Generisk trigger-funksjon
------------------------------------------------------------------
create or replace function public.set_organization_id_if_null()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null then
    new.organization_id := public.current_organization_id();
  end if;
  return new;
end $$;

------------------------------------------------------------------
-- Fest triggeren på hver org-scopet tabell.
-- routines har et globalt referansebibliotek (org_id null) men det
-- seedes med service_role/SQL — RLS hindrer brukere fra å lage NULL.
-- Triggeren er derfor trygg her også: NULL fra brukerflyten blir
-- til current_org; SQL-superuser kan fortsatt bypasse triggers.
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
    'custom_templates', 'project_comments'
  ];
  trg_name text;
begin
  foreach tbl in array org_tables loop
    if to_regclass('public.' || tbl) is null then
      continue;
    end if;

    trg_name := 'trg_' || tbl || '_set_org';

    -- Drop hvis vi har rullet tidligere
    execute format('drop trigger if exists %I on public.%I', trg_name, tbl);

    execute format($q$
      create trigger %I
        before insert on public.%I
        for each row execute function public.set_organization_id_if_null()
    $q$, trg_name, tbl);
  end loop;
end $$;

------------------------------------------------------------------
-- project_comments: 039 glemte denne. Backfill, kolonne, triggers, RLS.
------------------------------------------------------------------
alter table public.project_comments
  add column if not exists organization_id uuid
    references public.organizations(id) on delete cascade;

create index if not exists idx_project_comments_org
  on public.project_comments(organization_id);

-- Backfill fra parent project
update public.project_comments pc
set organization_id = p.organization_id
from public.projects p
where pc.project_id = p.id and pc.organization_id is null;

-- Drop alle eksisterende project_comments-policies så ingen permissiv
-- is_active()-policy kan OR-bypasse org-isolation
do $$
declare pol_name text;
begin
  for pol_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'project_comments'
  loop
    execute format('drop policy %I on public.project_comments', pol_name);
  end loop;
end $$;

create policy project_comments_org_isolation on public.project_comments
  for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

-- Triggeren fra do-blokken over fanger denne tabellen også, men det er
-- idempotent — verifiserer at den finnes:
drop trigger if exists trg_project_comments_set_org on public.project_comments;
create trigger trg_project_comments_set_org
  before insert on public.project_comments
  for each row execute function public.set_organization_id_if_null();

------------------------------------------------------------------
-- Relakser globale unique-constraints til (organization_id, X)
-- 039 glemte å gjøre dette — to bedrifter kan ikke ha samme
-- prosjektnummer "2025-001", samme team-navn "OP-01", osv.
------------------------------------------------------------------

-- projects.project_number
do $$ begin
  alter table public.projects drop constraint if exists projects_project_number_key;
exception when others then null; end $$;

create unique index if not exists projects_org_project_number_key
  on public.projects(organization_id, project_number);

-- groups.name
do $$ begin
  alter table public.groups drop constraint if exists groups_name_key;
exception when others then null; end $$;

create unique index if not exists groups_org_name_key
  on public.groups(organization_id, name);

-- task_types.slug
do $$ begin
  if to_regclass('public.task_types') is not null then
    alter table public.task_types drop constraint if exists task_types_slug_key;
  end if;
exception when others then null; end $$;

do $$ begin
  if to_regclass('public.task_types') is not null then
    execute 'create unique index if not exists task_types_org_slug_key '
            'on public.task_types(organization_id, slug)';
  end if;
end $$;

-- project_categories.slug
do $$ begin
  alter table public.project_categories drop constraint if exists project_categories_slug_key;
exception when others then null; end $$;

create unique index if not exists project_categories_org_slug_key
  on public.project_categories(organization_id, slug);

-- document_templates: kind var PRIMARY KEY globalt — må scopes per org.
-- Slett legacy-rader uten organization_id (stale fra pre-multi-tenant)
-- så vi kan opprette ny composite PK.
delete from public.document_templates where organization_id is null;

do $$ begin
  alter table public.document_templates drop constraint if exists document_templates_pkey;
exception when others then null; end $$;

do $$ begin
  alter table public.document_templates
    alter column organization_id set not null;
exception when others then null; end $$;

do $$ begin
  alter table public.document_templates add primary key (organization_id, kind);
exception when invalid_table_definition then null;
         when others then null; end $$;

------------------------------------------------------------------
-- Sanity: marker når migration kjørte
------------------------------------------------------------------
comment on function public.set_organization_id_if_null is
  'Defaults organization_id := current_organization_id() når NULL. '
  'Brukes som BEFORE INSERT trigger på alle org-scopede tabeller. '
  'Defense in depth — server actions skal også sette org_id eksplisitt.';
