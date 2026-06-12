-- 049_iso_env_aspects.sql
-- ISO 14001 6.1.2: miljøaspekter med betydning-scoring.
-- ISO 14001 6.1.3: compliance obligations (lover, forskrifter).

do $$ begin
  create type aspect_category as enum (
    'waste', 'energy', 'water', 'emissions_air', 'chemicals',
    'noise', 'soil', 'biodiversity', 'resources', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type aspect_lifecycle as enum (
    'normal', 'abnormal', 'emergency'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type compliance_status as enum (
    'compliant', 'non_compliant', 'under_review', 'not_applicable'
  );
exception when duplicate_object then null; end $$;

------------------------------------------------------------------
-- Environmental aspects register (14001 6.1.2)
------------------------------------------------------------------
create table if not exists public.env_aspects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  category aspect_category not null,
  lifecycle aspect_lifecycle not null default 'normal',
  -- Significance scoring: scale 1-5 hver, brukes til score = freq * severity
  frequency_score integer check (frequency_score between 1 and 5),
  severity_score integer check (severity_score between 1 and 5),
  -- Beregnet i applikasjonen, men lagret for filtrering/rapport
  significance_score integer generated always as (
    coalesce(frequency_score, 0) * coalesce(severity_score, 0)
  ) stored,
  is_significant boolean not null default false,
  control_measures text,
  -- Kobling til stoffkartotek hvis aspectet er kjemikalierelatert
  linked_substance_id uuid references public.substances(id) on delete set null,
  responsible_id uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_env_aspects_org_significant
  on public.env_aspects(organization_id, is_significant);

create index if not exists idx_env_aspects_category
  on public.env_aspects(organization_id, category);

------------------------------------------------------------------
-- Compliance obligations (14001 6.1.3)
------------------------------------------------------------------
create table if not exists public.compliance_obligations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  -- F.eks. "Forurensningsloven", "Avfallsforskriften", "FSE 2006"
  regulation text not null,
  requirement text not null,
  reference_url text,
  responsible_id uuid references public.profiles(id),
  evidence_url text,                                -- lenke til dokument
  evidence_document_id uuid references public.documents(id) on delete set null,
  status compliance_status not null default 'under_review',
  next_review_date date,
  notes text,
  -- Kobling tilbake til hvilke aspekter denne forpliktelsen berører
  related_aspect_ids uuid[] default '{}'::uuid[],
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_compliance_obligations_org_status
  on public.compliance_obligations(organization_id, status);

create index if not exists idx_compliance_obligations_review
  on public.compliance_obligations(organization_id, next_review_date)
  where next_review_date is not null;

do $$ begin
  create trigger trg_env_aspects_updated before update on public.env_aspects
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_compliance_obligations_updated before update on public.compliance_obligations
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.env_aspects enable row level security;
alter table public.compliance_obligations enable row level security;

create policy env_aspects_org on public.env_aspects
  for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

create policy compliance_obligations_org on public.compliance_obligations
  for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

create trigger trg_env_aspects_set_org
  before insert on public.env_aspects
  for each row execute function public.set_organization_id_if_null();

create trigger trg_compliance_obligations_set_org
  before insert on public.compliance_obligations
  for each row execute function public.set_organization_id_if_null();
