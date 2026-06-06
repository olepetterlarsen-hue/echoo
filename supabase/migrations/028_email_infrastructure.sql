-- OPControl: e-post-infrastruktur
-- email_log: alle utsendte e-poster med status og evt. feilmelding
-- notification_preferences: per-bruker on/off pr. varseltype

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  subject text not null,
  body_text text,
  body_html text,
  category text not null,
  -- Kategorier: 'deviation_assigned', 'comment_added', 'daily_digest', 'test', 'task_assigned'
  related_project_id uuid references public.projects(id) on delete set null,
  related_deviation_id uuid references public.deviations(id) on delete set null,
  status text not null default 'sent',
  -- Status: 'sent' eller 'failed'
  provider_message_id text,
  error text,
  sent_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_email_log_sent_at on public.email_log(sent_at desc);
create index if not exists idx_email_log_recipient on public.email_log(recipient);
create index if not exists idx_email_log_category on public.email_log(category);

alter table public.email_log enable row level security;

-- Bare admin kan se hele loggen
drop policy if exists email_log_select_admin on public.email_log;
create policy email_log_select_admin on public.email_log
  for select using (public.is_admin());

-- Alle aktive brukere kan logge sine egne sendinger (via server actions)
drop policy if exists email_log_insert on public.email_log;
create policy email_log_insert on public.email_log
  for insert with check (public.is_active());

-- Notification preferences i profiles
alter table public.profiles
  add column if not exists notify_deviation_assigned boolean not null default true,
  add column if not exists notify_comment_added boolean not null default true,
  add column if not exists notify_task_assigned boolean not null default true,
  add column if not exists notify_daily_digest boolean not null default false;

comment on table public.email_log is
  'Audit-log over alle e-poster sendt fra OPControl.';
comment on column public.profiles.notify_deviation_assigned is
  'Send e-post når et avvik tildeles meg.';
comment on column public.profiles.notify_comment_added is
  'Send e-post når noen kommenterer på et prosjekt jeg er tildelt.';
comment on column public.profiles.notify_task_assigned is
  'Send e-post når en oppgave tildeles meg.';
comment on column public.profiles.notify_daily_digest is
  'Send daglig oppsummering kl. 08:00 over alle åpne saker.';
