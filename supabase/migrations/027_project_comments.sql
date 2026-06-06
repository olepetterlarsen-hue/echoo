-- OPControl: kommentarer/diskusjon på prosjekt-nivå.
-- Brukes for intern kommunikasjon mellom prosjektleder, montør, elektriker etc.

create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_comments_project
  on public.project_comments(project_id, created_at desc);
create index if not exists idx_project_comments_author
  on public.project_comments(author_id);

do $$ begin
  create trigger trg_project_comments_updated before update on public.project_comments
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.project_comments enable row level security;

-- Alle aktive brukere kan lese
drop policy if exists project_comments_select on public.project_comments;
create policy project_comments_select on public.project_comments
  for select using (public.is_active());

-- Alle aktive brukere kan opprette egne kommentarer
drop policy if exists project_comments_insert on public.project_comments;
create policy project_comments_insert on public.project_comments
  for insert with check (public.is_active() and author_id = auth.uid());

-- Forfatteren kan oppdatere egne kommentarer; admin kan oppdatere alle
drop policy if exists project_comments_update on public.project_comments;
create policy project_comments_update on public.project_comments
  for update using (
    public.is_active() and (author_id = auth.uid() or public.is_admin())
  );

-- Forfatteren kan slette egne kommentarer; admin kan slette alle
drop policy if exists project_comments_delete on public.project_comments;
create policy project_comments_delete on public.project_comments
  for delete using (
    public.is_active() and (author_id = auth.uid() or public.is_admin())
  );

comment on table public.project_comments is
  'Kommentarer/diskusjon på prosjekt. Brukes for intern kommunikasjon mellom rollene.';
