-- 045_iso_capa_avvik.sql
-- ISO 9001 10.2 / 14001 10.2: avvik må håndteres med CAPA-prosess
-- (Corrective And Preventive Action).
--
-- Utvider deviations med:
--   - root_cause-kategori (strukturert) + fri tekst
--   - skille mellom umiddelbare tiltak (containment) og korrektive tiltak
--   - ansvarlig + frist
--   - verifikasjon: hvem, når, evidens — må fullføres før avviket lukkes
--
-- Lukke-policy: før status kan settes til 'lukket', må verified_at være satt.

------------------------------------------------------------------
-- Strukturert root cause-kategori
------------------------------------------------------------------
do $$ begin
  create type deviation_root_cause_category as enum (
    'menneskelig_feil',
    'manglende_opplaering',
    'utilstrekkelig_prosedyre',
    'materiell_svikt',
    'feil_verktoey',
    'miljoe_forhold',
    'kommunikasjon',
    'leverandoer',
    'design_feil',
    'annet'
  );
exception when duplicate_object then null; end $$;

------------------------------------------------------------------
-- CAPA-felter på deviations
------------------------------------------------------------------
alter table public.deviations
  -- Root cause analysis
  add column if not exists root_cause_category deviation_root_cause_category,
  add column if not exists root_cause_description text,
  -- Umiddelbart tiltak (containment): hva ble gjort med en gang
  add column if not exists containment_action text,
  add column if not exists containment_by uuid references public.profiles(id),
  add column if not exists containment_at timestamptz,
  -- Korrektive tiltak: hva må gjøres for å hindre gjentakelse
  add column if not exists corrective_action text,
  add column if not exists responsible_id uuid references public.profiles(id),
  add column if not exists due_date date,
  -- Verifikasjon: må fullføres før status kan settes til 'lukket'
  add column if not exists verified_by uuid references public.profiles(id),
  add column if not exists verified_at timestamptz,
  add column if not exists verification_evidence text;

-- enum_out (::text) er STABLE, ikke IMMUTABLE — kan ikke brukes i partial
-- index predicate. Sammenligning på enum-verdien direkte er IMMUTABLE.
create index if not exists idx_deviations_responsible
  on public.deviations(organization_id, responsible_id)
  where status <> 'lukket'::deviation_status;

create index if not exists idx_deviations_due_date
  on public.deviations(organization_id, due_date)
  where due_date is not null and status <> 'lukket'::deviation_status;

------------------------------------------------------------------
-- Trigger: hindre lukking før verifikasjon er fullført
-- ISO 9001 10.2.1d: "evaluate the effectiveness of any corrective
-- action taken" — vi tvinger explicit verification.
------------------------------------------------------------------
create or replace function public.enforce_capa_close()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'lukket' and (old.status is null or old.status != 'lukket') then
    if new.verified_by is null or new.verified_at is null then
      raise exception 'Avvik kan ikke lukkes før verifikasjon er fullført (verified_by + verified_at må være satt)';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_deviations_enforce_capa_close on public.deviations;
create trigger trg_deviations_enforce_capa_close
  before update on public.deviations
  for each row execute function public.enforce_capa_close();

comment on function public.enforce_capa_close is
  'ISO 9001 10.2: avvik må verifiseres effektivt før lukking.';
