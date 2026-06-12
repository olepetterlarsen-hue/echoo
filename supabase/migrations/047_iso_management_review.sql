-- 047_iso_management_review.sql
-- ISO 9001 9.3 / 14001 9.3: ledelsens gjennomgang.
--
-- management_reviews: planlagt gjennomgang med agenda, inputs, beslutninger.
-- management_review_actions: avgjørelser blir konkrete oppgaver via tasks.

do $$ begin
  create type management_review_status as enum (
    'scheduled', 'in_progress', 'completed'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.management_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  scheduled_date date not null,
  completed_date date,
  status management_review_status not null default 'scheduled',
  -- Agenda — standard ISO 9001 9.3.2-punkter forhåndsutfylt
  agenda jsonb not null default '[]'::jsonb,
  -- Snapshot av inputs ved review-tid (auto-pulled fra DB)
  -- { open_deviations: n, audit_findings: n, expiring_certs: n, ... }
  inputs_snapshot jsonb not null default '{}'::jsonb,
  -- Fritekst-beslutninger og refleksjoner
  decisions text,
  participants text,
  next_review_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_management_reviews_org_date
  on public.management_reviews(organization_id, scheduled_date desc);

-- Konkrete handlinger som kommer ut av reviewen.
-- Brukes som task-trigger: når en handling opprettes, lager vi gjerne
-- også en rad i tasks-tabellen for sporing.
create table if not exists public.management_review_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  review_id uuid not null references public.management_reviews(id) on delete cascade,
  description text not null,
  responsible_id uuid references public.profiles(id),
  due_date date,
  linked_task_id uuid references public.tasks(id) on delete set null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_mr_actions_review on public.management_review_actions(review_id);
create index if not exists idx_mr_actions_org on public.management_review_actions(organization_id);

do $$ begin
  create trigger trg_management_reviews_updated before update on public.management_reviews
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.management_reviews enable row level security;
alter table public.management_review_actions enable row level security;

create policy management_reviews_org on public.management_reviews
  for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

create policy management_review_actions_org on public.management_review_actions
  for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

create trigger trg_management_reviews_set_org
  before insert on public.management_reviews
  for each row execute function public.set_organization_id_if_null();

create trigger trg_management_review_actions_set_org
  before insert on public.management_review_actions
  for each row execute function public.set_organization_id_if_null();

------------------------------------------------------------------
-- Helper: hent input-snapshot for en review
-- Kjøres som security definer slik at review-eieren kan se tall fra
-- egen org uten å trenge select-tilgang til alle underliggende tabeller.
------------------------------------------------------------------
create or replace function public.management_review_inputs(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_open_deviations integer;
  v_overdue_deviations integer;
  v_audit_findings_open integer;
  v_expiring_certs integer;
  v_open_objectives integer;
begin
  -- Bare admin/installator/bemyndiget i egen org får hente
  if p_org_id != public.current_organization_id() then
    raise exception 'Cross-org access denied';
  end if;
  if public.current_role() not in ('admin', 'installator', 'bemyndiget') then
    raise exception 'Insufficient role';
  end if;

  select count(*) into v_open_deviations
  from public.deviations
  where organization_id = p_org_id and status != 'lukket';

  select count(*) into v_overdue_deviations
  from public.deviations
  where organization_id = p_org_id
    and status != 'lukket'
    and due_date < current_date;

  select count(*) into v_audit_findings_open
  from public.audit_findings af
  join public.audit_plans ap on ap.id = af.audit_plan_id
  where af.organization_id = p_org_id
    and af.linked_deviation_id is null;

  select count(*) into v_expiring_certs
  from public.certificates
  where organization_id = p_org_id
    and expires_date is not null
    and expires_date <= current_date + interval '90 days';

  -- objectives — kan eksistere etter 048
  if to_regclass('public.iso_objectives') is not null then
    execute 'select count(*) from public.iso_objectives where organization_id = $1 and status != ''met'''
      into v_open_objectives using p_org_id;
  else
    v_open_objectives := 0;
  end if;

  v_result := jsonb_build_object(
    'open_deviations', v_open_deviations,
    'overdue_deviations', v_overdue_deviations,
    'unresolved_audit_findings', v_audit_findings_open,
    'expiring_certificates_90d', v_expiring_certs,
    'open_objectives', v_open_objectives,
    'snapshot_at', now()
  );

  return v_result;
end $$;

revoke execute on function public.management_review_inputs(uuid) from public, anon;
grant execute on function public.management_review_inputs(uuid) to authenticated;
