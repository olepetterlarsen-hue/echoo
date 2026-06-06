-- OPControl: Tasks (planning-tasks, separat fra Avvik som er kvalitet-spesifikk)
-- Tasks er fritt definerte arbeidsoppgaver knyttet til prosjekt eller frittstående,
-- tildelt til individ eller gruppe, med 3-state status.

create table if not exists public.task_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_no text not null,
  label_en text not null,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.task_types (slug, label_no, label_en, order_index) values
  ('power_issue', 'Strømproblem', 'Power Issue', 10),
  ('cleanup', 'Opprydding', 'Cleanup', 20),
  ('coverage_issue', 'Dekningsproblem', 'Coverage Issue', 30),
  ('maintenance', 'Vedlikehold', 'Maintenance', 40),
  ('inspection', 'Inspeksjon', 'Inspection', 50),
  ('documentation', 'Dokumentasjon', 'Documentation', 60),
  ('coordination', 'Koordinering', 'Coordination', 70),
  ('other', 'Annet', 'Other', 100)
on conflict (slug) do nothing;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  task_type_slug text references public.task_types(slug),
  status text not null default 'initiated',
  -- Status: 'initiated', 'in_progress', 'resolved'
  assigned_to uuid references public.profiles(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  due_date date,
  reported_by uuid not null references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to) where status != 'resolved';
create index if not exists idx_tasks_group_id on public.tasks(group_id) where status != 'resolved';
create index if not exists idx_tasks_status_due on public.tasks(status, due_date);

do $$ begin
  create trigger trg_tasks_updated before update on public.tasks
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.tasks enable row level security;
alter table public.task_types enable row level security;

-- task_types: alle aktive brukere kan se; bare admin kan endre
drop policy if exists task_types_select on public.task_types;
create policy task_types_select on public.task_types
  for select using (public.is_active());

drop policy if exists task_types_admin on public.task_types;
create policy task_types_admin on public.task_types
  for all using (public.is_admin()) with check (public.is_admin());

-- tasks: alle aktive brukere kan se og opprette
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select using (public.is_active());

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert with check (public.is_active() and reported_by = auth.uid());

-- Oppdatering: oppretter, tildelt-person, admin
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update using (
    public.is_active() and (
      reported_by = auth.uid()
      or assigned_to = auth.uid()
      or public.is_admin()
    )
  );

-- Sletting: admin + oppretter
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete using (
    public.is_active() and (reported_by = auth.uid() or public.is_admin())
  );

comment on table public.tasks is
  'Planning-tasks. Frittstående eller knyttet til prosjekt. Tildelt individ eller gruppe.';
comment on column public.tasks.status is
  '''initiated'', ''in_progress'' eller ''resolved''. Brukes som kanban-kolonner.';
