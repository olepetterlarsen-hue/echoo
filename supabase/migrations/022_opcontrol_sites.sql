-- OPControl: sites (fysiske lokasjoner) tilhørende kunder.
-- Brukes for telecom-installasjoner (master, basestasjoner osv.) men også
-- generelle anleggsadresser for elektroarbeid.

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  external_site_id text,        -- kundens egen Site ID (Telenor ROT741 osv.)
  name text not null,
  address text,
  postal_code text,
  city text,
  province text,
  ssb_number text,
  latitude double precision,
  longitude double precision,
  site_type text,               -- mast, basestasjon, innendørs osv.
  notes text,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sites_customer on public.sites(customer_id);
create index if not exists idx_sites_external on public.sites(external_site_id);
create index if not exists idx_sites_coords on public.sites(latitude, longitude)
  where latitude is not null and longitude is not null;

do $$ begin
  create trigger trg_sites_updated before update on public.sites
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.sites enable row level security;

drop policy if exists sites_select on public.sites;
create policy sites_select on public.sites
  for select using (public.is_active());

drop policy if exists sites_insert on public.sites;
create policy sites_insert on public.sites
  for insert with check (public.is_active() and created_by = auth.uid());

drop policy if exists sites_update on public.sites;
create policy sites_update on public.sites
  for update using (
    public.is_active() and (
      public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
      or created_by = auth.uid()
    )
  );

drop policy if exists sites_delete on public.sites;
create policy sites_delete on public.sites
  for delete using (public.is_admin());
