-- 074_employment_contracts.sql
-- HR-onboarding: arbeidsavtaler som opprettes og signeres i Echoo.
--
-- Flyt:
--   1. Admin/leder oppretter avtale (utkast) med strukturerte felter.
--   2. Avtale sendes til ansattes e-post -> status 'sendt'. Ansatt signerer
--      via tokenisert lenke UTEN innlogging (sign_token).
--   3. Når ansatt har signert opprettes Supabase-bruker (bare e-post trengs),
--      profile_id kobles, og en 'provetid_evaluering'-oppgave lages med
--      forfall 14 dager før prøvetiden er over.
--
-- Lønn er sensitivt: SELECT er begrenset til admin i egen org (RLS). Ansatt
-- ser sin egen avtale via token-siden (server-side, service_role), ikke RLS.

-- Ny oppgavetype for prøvetids-evaluering (idempotent).
insert into public.task_types (slug, label_no, label_en, order_index) values
  ('provetid_evaluering', 'Prøvetidsevaluering', 'Probation Review', 80)
on conflict (slug) do nothing;

create table if not exists public.employment_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,

  -- Ansatt-identitet. profile_id fylles først når brukeren opprettes ved
  -- signering; før det finnes bare e-post + navn på avtalen.
  employee_email text not null,
  employee_name text not null,
  profile_id uuid references public.profiles(id) on delete set null,

  -- Strukturerte avtalefelter (driver enkle menyer + AI-sjekk).
  stilling text,
  ansettelsesform text not null default 'fast'
    check (ansettelsesform in ('fast', 'midlertidig', 'vikariat', 'laerling')),
  stillingsprosent integer not null default 100
    check (stillingsprosent between 1 and 100),
  arbeidssted text,
  start_date date,
  -- Norsk prøvetid: maks 6 måneder (aml. § 15-6).
  provetid_mnd integer not null default 6
    check (provetid_mnd between 0 and 6),
  -- Beregnes i app-laget (start_date + provetid_mnd) og lagres eksplisitt,
  -- slik at importerte avtaler kan ha avvikende dato.
  provetid_slutt date,
  lonn_type text not null default 'fastlonn'
    check (lonn_type in ('fastlonn', 'timelonn')),
  lonn_belop numeric(12, 2),
  oppsigelsestid_mnd integer not null default 1,

  -- Fritekst-klausuler o.l. (AI-forslag lagres her). {key: text}.
  terms jsonb not null default '{}'::jsonb,

  status text not null default 'utkast'
    check (status in ('utkast', 'sendt', 'signert', 'kansellert')),
  source text not null default 'opprettet'
    check (source in ('opprettet', 'importert_pdf')),

  -- Tokenisert signeringslenke for ansatt uten konto. Settes av app-laget.
  sign_token text unique,
  token_expires_at timestamptz,

  -- Arbeidsgiver-signatur (admin/leder med konto + signatur i profil).
  employer_signed_by uuid references public.profiles(id) on delete set null,
  employer_signed_at timestamptz,
  employer_signature_snapshot text,

  -- Ansatt-signatur (fanget på token-siden).
  employee_signed_at timestamptz,
  employee_signed_name text,
  employee_signature_snapshot text,

  pdf_path text,

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_employment_contracts_org
  on public.employment_contracts(organization_id);
create index if not exists idx_employment_contracts_profile
  on public.employment_contracts(profile_id);
create index if not exists idx_employment_contracts_status
  on public.employment_contracts(organization_id, status);
-- Rask oppslag fra token-signeringssiden.
create unique index if not exists idx_employment_contracts_sign_token
  on public.employment_contracts(sign_token) where sign_token is not null;

do $$ begin
  create trigger trg_employment_contracts_updated
    before update on public.employment_contracts
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

drop trigger if exists trg_employment_contracts_set_org
  on public.employment_contracts;
create trigger trg_employment_contracts_set_org
  before insert on public.employment_contracts
  for each row execute function public.set_organization_id_if_null();

alter table public.employment_contracts enable row level security;

-- Lønn er sensitivt: kun admin i egen org kan lese/skrive via RLS. Ansatt-
-- signering går gjennom server-actions med service_role (bypasser RLS).
drop policy if exists employment_contracts_admin on public.employment_contracts;
create policy employment_contracts_admin on public.employment_contracts
  for all to authenticated
  using (
    public.is_admin()
    and organization_id = (select public.current_organization_id())
  )
  with check (
    public.is_admin()
    and organization_id = (select public.current_organization_id())
  );

comment on table public.employment_contracts is
  'Arbeidsavtaler opprettet og signert i Echoo. Ansatt signerer via sign_token uten konto; bruker opprettes ved fullført signering. SELECT begrenset til admin (lønn er sensitivt).';
comment on column public.employment_contracts.sign_token is
  'Engangs-token for ansattens signeringslenke. Nullstilles/utløper etter signering.';
comment on column public.employment_contracts.provetid_slutt is
  'Prøvetidens sluttdato. Beregnes i app-laget; 14 dager før denne opprettes en provetid_evaluering-oppgave.';

notify pgrst, 'reload schema';
