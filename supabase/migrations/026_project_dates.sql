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
