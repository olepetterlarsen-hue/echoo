-- 068_tasks_task_type_fk.sql
-- Migration 061 droppet FK-en tasks.task_type_slug → task_types.slug med
-- CASCADE da unique-constraint på task_types.slug ble erstattet med
-- (organization_id, slug). Kommentaren sa "rebygging kan tas i en senere
-- migrasjon" — det skjedde aldri. Konsekvens: PostgREST kan ikke gjøre
-- task_type:task_types(...)-embedded-join, så /oppgaver/[id] returnerer
-- 404 fra .single() og listevisninger blir tomme.
--
-- Fix: legg til composite-FK på (organization_id, task_type_slug) som
-- matcher unique-index task_types_org_slug_key fra migration 061.
-- PostgREST 9+ støtter composite-embedded-join.
--
-- ON DELETE SET NULL bare på task_type_slug så vi ikke nuker tasks når
-- en type slettes. organization_id blir uberørt (cascadet fra tasks.org_id
-- direkte via tasks_organization_id_fkey).

-- Sett task_type_slug = null for rader der (org, slug) ikke matcher en
-- eksisterende task_type — slipper FK-violation når constraint legges på.
update public.tasks t
set task_type_slug = null
where task_type_slug is not null
  and not exists (
    select 1 from public.task_types tt
    where tt.organization_id = t.organization_id
      and tt.slug = t.task_type_slug
  );

-- Legg til composite-FK. ON UPDATE CASCADE så slug-rename propagerer.
alter table public.tasks
  drop constraint if exists tasks_task_type_fk;

alter table public.tasks
  add constraint tasks_task_type_fk
  foreign key (organization_id, task_type_slug)
  references public.task_types (organization_id, slug)
  on update cascade
  on delete set null;

-- Be PostgREST om å refreshe schema-cachen så den oppdager den nye relasjonen.
notify pgrst, 'reload schema';
