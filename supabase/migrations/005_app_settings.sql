-- App-innstillinger: legacy single-tenant settings.
-- I Echoo (multi-tenant) er disse feltene replikert per-organisasjon i
-- organizations-tabellen (se 039_echoo_multi_tenant.sql). app_settings
-- beholdes for bakoverkompatibilitet med eksisterende kode som leser via
-- getAppSettings() — den henter typisk én rad med id='company' og brukes
-- som fallback når org_id ikke er kjent.

create table if not exists public.app_settings (
  id text primary key default 'company',
  firma text not null default 'Bedriftsnavn',
  org_nr text,
  selskap_adresse text,
  selskap_postnr text,
  selskap_sted text,
  selskap_telefon text,
  selskap_epost text,
  installator_navn text,
  installator_tittel text,
  installator_telefon text,
  installator_epost text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

do $$ begin
  create trigger trg_app_settings_updated before update on public.app_settings
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select using (public.is_active());

drop policy if exists app_settings_update_admin on public.app_settings;
create policy app_settings_update_admin on public.app_settings
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists app_settings_insert_admin on public.app_settings;
create policy app_settings_insert_admin on public.app_settings
  for insert with check (public.is_admin());
