-- OPControl: Stoffkartotek — HMS-lovpålagt oversikt over kjemiske stoffer
-- med sikkerhetsdatablader (SDS), GHS-fareklasser og verneutstyr.

create table if not exists public.substances (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Norsk handelsnavn
  manufacturer text,
  -- Produsent/leverandør
  cas_number text,
  -- CAS-registreringsnr. (kjemisk identifikator)
  usage_area text,
  -- Hvor det brukes (f.eks. "Verksted", "På bil", "Lager")
  storage_location text,
  -- Hvor det lagres
  ghs_pictograms text[] not null default '{}',
  -- Array av GHS-koder: GHS01..GHS09
  hazard_statements text,
  -- H-statements som fritekst eller komma-separert
  precautionary_measures text,
  -- Vernetiltak (verneutstyr, ventilasjon osv.)
  sds_file_path text,
  -- Storage-path til sikkerhetsdatablad PDF
  sds_revision_date date,
  -- Når SDS sist ble revidert av produsenten
  quantity_estimate text,
  -- F.eks. "5 liter", "2 spray-bokser"
  notes text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_substances_active on public.substances(active);
create index if not exists idx_substances_name on public.substances(name);

do $$ begin
  create trigger trg_substances_updated before update on public.substances
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.substances enable row level security;

drop policy if exists substances_select on public.substances;
create policy substances_select on public.substances
  for select using (public.is_active());

drop policy if exists substances_insert on public.substances;
create policy substances_insert on public.substances
  for insert with check (
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists substances_update on public.substances;
create policy substances_update on public.substances
  for update using (
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists substances_delete on public.substances;
create policy substances_delete on public.substances
  for delete using (public.is_admin());

-- Storage bucket for SDS-PDF-er. Privat (krever signed URL).
insert into storage.buckets (id, name, public)
values ('substance-sds', 'substance-sds', false)
on conflict (id) do nothing;

-- Alle aktive brukere kan lese SDS-filer
drop policy if exists "substance_sds_select" on storage.objects;
create policy "substance_sds_select" on storage.objects
  for select using (
    bucket_id = 'substance-sds' and public.is_active()
  );

-- Privileged roller kan laste opp / oppdatere / slette
drop policy if exists "substance_sds_insert" on storage.objects;
create policy "substance_sds_insert" on storage.objects
  for insert with check (
    bucket_id = 'substance-sds' and
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists "substance_sds_update" on storage.objects;
create policy "substance_sds_update" on storage.objects
  for update using (
    bucket_id = 'substance-sds' and
    public.is_active() and
    public.current_role() in ('admin', 'installator', 'bemyndiget', 'prosjektleder')
  );

drop policy if exists "substance_sds_delete" on storage.objects;
create policy "substance_sds_delete" on storage.objects
  for delete using (
    bucket_id = 'substance-sds' and public.is_admin()
  );

comment on table public.substances is
  'Stoffkartotek (HMS-lovpålagt) over kjemiske stoffer i bruk.';
