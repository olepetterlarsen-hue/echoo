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
