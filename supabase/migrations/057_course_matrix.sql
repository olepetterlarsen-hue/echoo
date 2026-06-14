-- 057_course_matrix.sql
-- Kursmatrise + HR-felter på profiles.
--
-- Domenemodell:
--   required_courses: hvilke kurs bedriften krever av sine ansatte.
--     F.eks. "FSE-kurs lavspenning", "Førstehjelp", "Arbeid i høyden".
--   certificates.required_course_id: linker et sertifikat til hvilket
--     påkrevet kurs det dekker, slik at matrisen kan bygges.
--   profiles.hms_card_number: HR-felt for HMS-kort-nummer.

------------------------------------------------------------------
-- required_courses
------------------------------------------------------------------
create table if not exists public.required_courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  validity_months integer,                          -- null = ingen utløp
  category text,                                    -- f.eks. "Elsikkerhet", "HMS"
  is_active boolean not null default true,
  order_index integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_required_courses_org_active
  on public.required_courses(organization_id, is_active);

do $$ begin
  create trigger trg_required_courses_updated before update on public.required_courses
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.required_courses enable row level security;

create policy required_courses_select on public.required_courses
  for select to authenticated
  using (organization_id = (select public.current_organization_id()));

create policy required_courses_admin_write on public.required_courses
  for all to authenticated
  using (
    public.is_admin()
    and organization_id = (select public.current_organization_id())
  )
  with check (
    public.is_admin()
    and organization_id = (select public.current_organization_id())
  );

drop trigger if exists trg_required_courses_set_org on public.required_courses;
create trigger trg_required_courses_set_org
  before insert on public.required_courses
  for each row execute function public.set_organization_id_if_null();

------------------------------------------------------------------
-- certificates: linke til required_course
------------------------------------------------------------------
alter table public.certificates
  add column if not exists required_course_id uuid
    references public.required_courses(id) on delete set null,
  add column if not exists ai_generated boolean not null default false;

create index if not exists idx_certificates_required_course
  on public.certificates(required_course_id)
  where required_course_id is not null;

------------------------------------------------------------------
-- profiles: HR-felter
------------------------------------------------------------------
alter table public.profiles
  add column if not exists hms_card_number text;

------------------------------------------------------------------
-- Seed: vanlige norske elektrobransje-kurs som forslag for nye orgs
-- (lagres som forslag i status, men admin kan redigere/slette)
------------------------------------------------------------------
create or replace function public.seed_required_courses_for_org(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.required_courses where organization_id = p_org_id
  ) then
    insert into public.required_courses (
      organization_id, name, description, category, validity_months, order_index
    ) values
      (p_org_id, 'FSE-kurs lavspenning',
       'Forskrift om sikkerhet ved arbeid i og drift av elektriske anlegg, lavspenning.',
       'Elsikkerhet', 12, 1),
      (p_org_id, 'FSE-kurs høyspenning',
       'FSE-kurs for arbeid på/nær høyspenningsanlegg.',
       'Elsikkerhet', 12, 2),
      (p_org_id, 'Førstehjelp og hjerte-lunge-redning',
       'Grunnleggende førstehjelp inkludert HLR for elektrikere.',
       'HMS', 24, 3),
      (p_org_id, 'Arbeid i høyden',
       'Sertifisert opplæring i bruk av personlig fallsikringsutstyr.',
       'HMS', 60, 4),
      (p_org_id, 'Stiger og stillas',
       'Bruker-opplæring for stiger og stillas.',
       'HMS', 60, 5),
      (p_org_id, 'Varme arbeider',
       'Sertifikat for utførelse av varme arbeider.',
       'HMS', 60, 6),
      (p_org_id, 'Sakkyndig kontroll av elektriske installasjoner',
       'Kompetanse for å utføre sakkyndig kontroll etter NEK 405.',
       'Elsikkerhet', 60, 7);
  end if;
end $$;

revoke execute on function public.seed_required_courses_for_org(uuid)
  from public, anon;
grant execute on function public.seed_required_courses_for_org(uuid)
  to service_role, authenticated;

-- Backfill: seed for alle eksisterende orgs som ikke har påkrevde kurs.
-- For framtidige signups: legg til kallet i seed_iso_defaults_for_org.
do $$
declare
  v_org_id uuid;
begin
  for v_org_id in select id from public.organizations loop
    perform public.seed_required_courses_for_org(v_org_id);
  end loop;
end $$;

------------------------------------------------------------------
-- Database type-hint
------------------------------------------------------------------
comment on table public.required_courses is
  'Kurs bedriften krever av sine ansatte. Linker til certificates via '
  'certificates.required_course_id slik at kursmatrisen kan vise '
  'status per ansatt × kurs.';
