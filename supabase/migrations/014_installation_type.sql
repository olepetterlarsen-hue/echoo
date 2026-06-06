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
