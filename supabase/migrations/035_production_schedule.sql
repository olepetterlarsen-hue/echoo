-- OPControl: Produksjonsplan (Gantt) — planlagte arbeidsoppdrag med
-- team-tilhørighet og periode. Off-perioder (ferie/sykdom/helligdag) er
-- egen tabell som vises som stripete overlegg.

create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  title text,
  -- valgfri override; ellers vises project.title
  start_date date not null,
  end_date date not null,
  status text not null default 'planned',
  -- 'planned' | 'in_progress' | 'done' | 'revisit'
  locked boolean not null default false,
  locked_reason text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_dates_valid check (end_date >= start_date)
);

create index if not exists idx_schedule_dates on public.schedule_entries(start_date, end_date);
create index if not exists idx_schedule_group on public.schedule_entries(group_id);
create index if not exists idx_schedule_project on public.schedule_entries(project_id);

do $$ begin
  create trigger trg_schedule_updated before update on public.schedule_entries
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

create table if not exists public.schedule_off_periods (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  -- null group_id = gjelder alle team (f.eks. nasjonal helligdag)
  start_date date not null,
  end_date date not null,
  reason text not null default 'vacation',
  -- 'vacation' | 'sick' | 'holiday' | 'other'
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint off_dates_valid check (end_date >= start_date)
);

create index if not exists idx_off_dates on public.schedule_off_periods(start_date, end_date);
create index if not exists idx_off_group on public.schedule_off_periods(group_id);

alter table public.schedule_entries enable row level security;
alter table public.schedule_off_periods enable row level security;

-- Alle aktive brukere kan se planen
drop policy if exists schedule_entries_select on public.schedule_entries;
create policy schedule_entries_select on public.schedule_entries
  for select using (public.is_active());

drop policy if exists schedule_off_select on public.schedule_off_periods;
create policy schedule_off_select on public.schedule_off_periods
  for select using (public.is_active());

-- Admin + prosjektleder + installator + bemyndiget kan redigere
drop policy if exists schedule_entries_write on public.schedule_entries;
create policy schedule_entries_write on public.schedule_entries
  for all using (
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  ) with check (
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists schedule_off_write on public.schedule_off_periods;
create policy schedule_off_write on public.schedule_off_periods
  for all using (
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  ) with check (
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

comment on table public.schedule_entries is
  'Produksjonsplan: planlagte arbeidsoppdrag i tidsperioder, tildelt team/gruppe.';
comment on table public.schedule_off_periods is
  'Off-perioder (ferie/sykdom/helligdag) som vises som overlegg på kalenderen.';
