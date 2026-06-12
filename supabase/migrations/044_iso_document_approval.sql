-- 044_iso_document_approval.sql
-- ISO 9001 7.5: dokumentstyring krever en formell approval-flyt.
-- Utvider documents fra (utkast | signert) til:
--   utkast → under_review → approved → signert
-- Plus 'rejected' fra under_review (kaster tilbake til utkast eller arkiveres).
--
-- approver-felter, change-log, og en separat tabell for review-historikk.

------------------------------------------------------------------
-- Utvid document_status-enumen
------------------------------------------------------------------
do $$ begin
  alter type document_status add value if not exists 'under_review';
exception when others then null; end $$;

do $$ begin
  alter type document_status add value if not exists 'approved';
exception when others then null; end $$;

do $$ begin
  alter type document_status add value if not exists 'rejected';
exception when others then null; end $$;

------------------------------------------------------------------
-- Approval-felter på documents
------------------------------------------------------------------
alter table public.documents
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists approved_at timestamptz,
  add column if not exists approval_notes text,
  add column if not exists rejected_by uuid references public.profiles(id),
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists submitted_for_review_by uuid references public.profiles(id),
  add column if not exists submitted_for_review_at timestamptz,
  -- Change-log: kort begrunnelse hvorfor denne versjonen ble laget.
  -- (ISO 9001 7.5.3.2: "control of changes")
  add column if not exists change_summary text;

-- Vi kan ikke lage en partial index på 'under_review' i samme migration
-- som vi legger til verdien (Postgres betrakter ny enum-verdi som ikke-
-- immutable i samme transaksjon). Bruker full index — query-planneren
-- kombinerer den med WHERE-filter på status.
create index if not exists idx_documents_org_status
  on public.documents(organization_id, status);

------------------------------------------------------------------
-- Review-historikk: hvert state-skifte logges (compliance-spor)
------------------------------------------------------------------
create table if not exists public.document_review_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  from_status document_status,
  to_status document_status not null,
  actor_id uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_document_review_events_doc
  on public.document_review_events(document_id, created_at desc);

create index if not exists idx_document_review_events_org
  on public.document_review_events(organization_id);

alter table public.document_review_events enable row level security;

drop policy if exists document_review_events_org on public.document_review_events;
create policy document_review_events_org on public.document_review_events
  for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

drop trigger if exists trg_document_review_events_set_org on public.document_review_events;
create trigger trg_document_review_events_set_org
  before insert on public.document_review_events
  for each row execute function public.set_organization_id_if_null();

comment on table public.document_review_events is
  'ISO 9001 7.5.3 sporbarhet for dokument-godkjenning. '
  'Hvert state-skifte (submitForReview/approve/reject/sign) lager en rad.';
