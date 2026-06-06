-- OPControl: project_stages (kanban-kolonner) og groups (prosess-team).

create table if not exists public.project_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  order_index integer not null default 0,
  color text default '#9A9AA4',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create trigger trg_project_stages_updated before update on public.project_stages
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.project_stages enable row level security;

drop policy if exists project_stages_select on public.project_stages;
create policy project_stages_select on public.project_stages
  for select using (public.is_active());

drop policy if exists project_stages_admin_write on public.project_stages;
create policy project_stages_admin_write on public.project_stages
  for all using (public.is_admin()) with check (public.is_admin());

-- Default-kanban (kan endres av admin)
insert into public.project_stages (name, order_index, color) values
  ('Salg / Tilbud', 1, '#3B82F6'),
  ('TSSR / Befaring', 2, '#A855F7'),
  ('Planlegging', 3, '#EAB308'),
  ('Produksjon', 4, '#F47920'),
  ('As-built / Dokumentasjon', 5, '#06B6D4'),
  ('Ferdig', 6, '#10B981')
on conflict do nothing;

------------------------------------------------------------------
-- Groups: prosess-team som kan tildeles oppgaver
------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  email text,                       -- distribusjons-e-post
  description text,
  color text default '#9A9AA4',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create trigger trg_groups_updated before update on public.groups
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (group_id, user_id)
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
  for select using (public.is_active());

drop policy if exists groups_admin_write on public.groups;
create policy groups_admin_write on public.groups
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select using (public.is_active());

drop policy if exists group_members_admin_write on public.group_members;
create policy group_members_admin_write on public.group_members
  for all using (public.is_admin()) with check (public.is_admin());

-- Standardgrupper
insert into public.groups (name, description, color) values
  ('Salg', 'Salg og tilbud',           '#3B82F6'),
  ('TSSR', 'Site survey og prosjektering', '#A855F7'),
  ('Produksjon', 'Feltarbeid og installasjon', '#F47920'),
  ('ABD', 'As-Built Documentation',    '#06B6D4'),
  ('Administrasjon', 'Ledelse og support', '#9A9AA4')
on conflict (name) do nothing;
