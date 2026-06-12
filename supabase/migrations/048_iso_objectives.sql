-- 048_iso_objectives.sql
-- ISO 9001 6.2 + 14001 6.2: kvalitets- og miljømål.
--
-- iso_objectives: mål med kategori (kvalitet/miljø), target, tidsfrist,
-- ansvarlig, KPI-progress.

do $$ begin
  create type objective_kind as enum ('quality', 'environment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type objective_status as enum ('proposed', 'active', 'met', 'missed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.iso_objectives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  kind objective_kind not null,
  title text not null,
  description text,
  target_value text,                               -- "5% reduksjon", "<= 3 avvik"
  unit text,                                       -- "%", "antall", "kg"
  baseline_value numeric,
  current_value numeric,
  target_numeric numeric,                          -- For KPI-progress beregning
  start_date date not null default current_date,
  deadline date,
  responsible_id uuid references public.profiles(id),
  status objective_status not null default 'active',
  measurement_method text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_iso_objectives_org_kind
  on public.iso_objectives(organization_id, kind);

create index if not exists idx_iso_objectives_status
  on public.iso_objectives(organization_id, status);

create index if not exists idx_iso_objectives_deadline
  on public.iso_objectives(organization_id, deadline)
  where deadline is not null and status = 'active';

------------------------------------------------------------------
-- KPI-historikk: tidsserie av målinger per objective
------------------------------------------------------------------
create table if not exists public.iso_objective_measurements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  objective_id uuid not null references public.iso_objectives(id) on delete cascade,
  value numeric not null,
  notes text,
  measured_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id)
);

create index if not exists idx_iso_objective_measurements_obj
  on public.iso_objective_measurements(objective_id, measured_at desc);

do $$ begin
  create trigger trg_iso_objectives_updated before update on public.iso_objectives
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.iso_objectives enable row level security;
alter table public.iso_objective_measurements enable row level security;

create policy iso_objectives_org on public.iso_objectives
  for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

create policy iso_objective_measurements_org on public.iso_objective_measurements
  for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

create trigger trg_iso_objectives_set_org
  before insert on public.iso_objectives
  for each row execute function public.set_organization_id_if_null();

create trigger trg_iso_objective_measurements_set_org
  before insert on public.iso_objective_measurements
  for each row execute function public.set_organization_id_if_null();
