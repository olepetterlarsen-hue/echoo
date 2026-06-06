-- 037_issue_reports.sql
-- Issue/bug-reporter tilgjengelig fra Report Issue-knappen i AppShell.
-- Alle aktive brukere kan rapportere. Bare admin kan lese og oppdatere.

do $$ begin
  create type issue_severity as enum ('lav', 'middels', 'hoey');
exception when duplicate_object then null; end $$;

do $$ begin
  create type issue_status as enum ('apen', 'under_arbeid', 'lukket');
exception when duplicate_object then null; end $$;

create table if not exists public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  reported_by uuid not null references public.profiles(id) on delete set null,
  title text not null,
  description text,
  severity issue_severity not null default 'middels',
  status issue_status not null default 'apen',
  page_url text,
  user_agent text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_issue_reports_status on public.issue_reports(status);
create index if not exists idx_issue_reports_reported_by on public.issue_reports(reported_by);
create index if not exists idx_issue_reports_created on public.issue_reports(created_at desc);

do $$ begin
  create trigger trg_issue_reports_updated before update on public.issue_reports
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.issue_reports enable row level security;

-- Alle aktive brukere kan rapportere
drop policy if exists issue_reports_insert on public.issue_reports;
create policy issue_reports_insert on public.issue_reports
  for insert with check (public.is_active() and reported_by = auth.uid());

-- Brukere ser sine egne rapporter; admin ser alle
drop policy if exists issue_reports_select on public.issue_reports;
create policy issue_reports_select on public.issue_reports
  for select using (reported_by = auth.uid() or public.is_admin());

-- Bare admin oppdaterer/lukker
drop policy if exists issue_reports_update_admin on public.issue_reports;
create policy issue_reports_update_admin on public.issue_reports
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists issue_reports_delete_admin on public.issue_reports;
create policy issue_reports_delete_admin on public.issue_reports
  for delete using (public.is_admin());
