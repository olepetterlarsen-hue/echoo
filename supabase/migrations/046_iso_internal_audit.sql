-- 046_iso_internal_audit.sql
-- ISO 9001 9.2 / 14001 9.2: internal audit program.
--
-- audit_plans: planlagte revisjoner (scope, auditor, dato, sjekkliste-mal).
-- audit_checklist_templates: gjenbrukbare maler.
-- audit_findings: funn per revisjon, lenkbar til avvik (CAPA).

------------------------------------------------------------------
-- Audit plan
------------------------------------------------------------------
do $$ begin
  create type audit_status as enum ('planned', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_finding_severity as enum ('observation', 'minor', 'major', 'critical');
exception when duplicate_object then null; end $$;

create table if not exists public.audit_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  -- jsonb: { sections: [{ title, items: [{ key, question, expected? }] }] }
  definition jsonb not null default '{"sections": []}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_audit_checklist_templates_org
  on public.audit_checklist_templates(organization_id);

create table if not exists public.audit_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  scope text not null,
  auditor_id uuid references public.profiles(id),
  external_auditor_name text,
  planned_date date not null,
  completed_date date,
  status audit_status not null default 'planned',
  checklist_template_id uuid references public.audit_checklist_templates(id) on delete set null,
  -- Brukerens utfylte sjekklisten (key → svar/notater)
  checklist_responses jsonb not null default '{}'::jsonb,
  summary text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_audit_plans_org_date
  on public.audit_plans(organization_id, planned_date desc);

create index if not exists idx_audit_plans_status
  on public.audit_plans(organization_id, status);

create table if not exists public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  audit_plan_id uuid not null references public.audit_plans(id) on delete cascade,
  title text not null,
  description text,
  severity audit_finding_severity not null default 'observation',
  reference text,                                 -- f.eks. "ISO 9001 7.5.3"
  linked_deviation_id uuid references public.deviations(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_audit_findings_plan
  on public.audit_findings(audit_plan_id);

create index if not exists idx_audit_findings_org
  on public.audit_findings(organization_id);

------------------------------------------------------------------
-- updated_at triggers
------------------------------------------------------------------
do $$ begin
  create trigger trg_audit_checklist_templates_updated before update on public.audit_checklist_templates
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_audit_plans_updated before update on public.audit_plans
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_audit_findings_updated before update on public.audit_findings
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

------------------------------------------------------------------
-- RLS + org-defaults
------------------------------------------------------------------
alter table public.audit_checklist_templates enable row level security;
alter table public.audit_plans enable row level security;
alter table public.audit_findings enable row level security;

create policy audit_checklist_templates_org on public.audit_checklist_templates
  for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

create policy audit_plans_org on public.audit_plans
  for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

create policy audit_findings_org on public.audit_findings
  for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

create trigger trg_audit_checklist_templates_set_org
  before insert on public.audit_checklist_templates
  for each row execute function public.set_organization_id_if_null();

create trigger trg_audit_plans_set_org
  before insert on public.audit_plans
  for each row execute function public.set_organization_id_if_null();

create trigger trg_audit_findings_set_org
  before insert on public.audit_findings
  for each row execute function public.set_organization_id_if_null();
