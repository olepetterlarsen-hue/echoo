-- 058_echoo_staff_and_sales.sql
-- Intern Echoo-CRM på /team — egen sub-app for Echoo-ansatte (selgere,
-- support, admin). De er IKKE kunder i noen tenant. Schema:
--   profiles.is_echoo_staff: boolean — markerer Echoo-ansatte
--   sales_assignments: org → selger, brukes til provisjonsberegning
--
-- RLS-regelen: kun is_echoo_staff = true kan se/skrive sales_assignments.
-- Server actions bruker createAdminClient for å lese på tvers av orgs.

------------------------------------------------------------------
-- profiles.is_echoo_staff
------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_echoo_staff boolean not null default false;

create index if not exists idx_profiles_echoo_staff
  on public.profiles(is_echoo_staff) where is_echoo_staff = true;

comment on column public.profiles.is_echoo_staff is
  'Echoo-ansatte (selgere, support). Får tilgang til /team-sub-appen som '
  'viser kunder på tvers av orgs. Er IKKE kunder i noen tenant — kan ha '
  'organization_id = NULL.';

------------------------------------------------------------------
-- sales_assignments
------------------------------------------------------------------
create table if not exists public.sales_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique
    references public.organizations(id) on delete cascade,
  salesperson_id uuid not null
    references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sales_assignments_salesperson
  on public.sales_assignments(salesperson_id);

do $$ begin
  create trigger trg_sales_assignments_updated before update on public.sales_assignments
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.sales_assignments enable row level security;

-- Kun Echoo-staff (eller service_role) får se/endre
drop policy if exists sales_assignments_staff_all on public.sales_assignments;
create policy sales_assignments_staff_all on public.sales_assignments
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_echoo_staff = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_echoo_staff = true
    )
  );

------------------------------------------------------------------
-- Helper: is_echoo_staff()
-- Kortere variant for bruk i andre policies / queries
------------------------------------------------------------------
create or replace function public.is_echoo_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select is_echoo_staff from public.profiles where id = auth.uid()),
    false
  )
$$;

------------------------------------------------------------------
-- Markér demo-brukeren ole@opcom.no som echoo-staff
-- så Ole kan teste /team selv (han har også en kunde-org).
------------------------------------------------------------------
update public.profiles
set is_echoo_staff = true
where email = 'ole@opcom.no';
