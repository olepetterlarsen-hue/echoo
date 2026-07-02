-- 070_document_participants.sql
-- Deltaker-signering: flere personer (f.eks. SJA-deltakere på anlegget) kan
-- signere samme dokument fra sin egen bruker. En signeringsforespørsel
-- oppretter en oppgave på deltakerens «Mine oppgaver»; når deltakeren
-- signerer løses oppgaven automatisk.

create table if not exists public.document_participants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  status text not null default 'ventende'
    check (status in ('ventende', 'signert')),
  signed_at timestamptz,
  signed_name text,
  signature_snapshot text,
  created_at timestamptz not null default now(),
  unique (document_id, profile_id)
);

create index if not exists idx_document_participants_doc
  on public.document_participants(document_id);
create index if not exists idx_document_participants_profile
  on public.document_participants(profile_id, status);
create index if not exists idx_document_participants_org
  on public.document_participants(organization_id);

alter table public.document_participants enable row level security;

drop policy if exists document_participants_org on public.document_participants;
create policy document_participants_org on public.document_participants
  for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

drop trigger if exists trg_document_participants_set_org on public.document_participants;
create trigger trg_document_participants_set_org
  before insert on public.document_participants
  for each row execute function public.set_organization_id_if_null();

comment on table public.document_participants is
  'Deltaker-signaturer på dokumenter (f.eks. SJA): hver deltaker signerer samme dokument fra egen bruker. Signert rad er uforanderlig compliance-spor.';

notify pgrst, 'reload schema';
