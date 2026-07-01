-- 069_backfill_org_from_app_settings.sql
-- Fixer duplikat-registrering av firma-info: både /admin/innstillinger
-- (skrev til app_settings) og /admin/bedrift (skrev til organizations)
-- hadde de samme feltene. PDF-rendering leste kun fra app_settings, så
-- brukere som fylte ut Bedrift-siden merket ingen effekt.
--
-- Fra 2026-07-01 er `organizations` master og `app_settings` deprekert
-- for firma-info. /admin/innstillinger redirecter til /admin/bedrift.
--
-- Denne migrasjonen kopierer app_settings-verdiene inn i organizations-
-- rader som fortsatt har tomme felter, slik at ingen data mister effekt
-- i PDF-rendering.

do $$
declare
  as_row record;
begin
  -- app_settings har id='company' som single-tenant-raden. Ingen loop
  -- nødvendig; hent den ene raden.
  select * into as_row from public.app_settings where id = 'company';
  if not found then
    return;
  end if;

  -- Oppdater alle organizations som mangler noen av feltene. Vi bruker
  -- COALESCE så eksisterende (nyere) org-verdier ikke overskrives —
  -- kun tomme/null felter fylles fra app_settings.
  update public.organizations o
  set
    firma = case
      when o.firma is null or o.firma = '' or o.firma = 'Bedriftsnavn'
        then coalesce(as_row.firma, o.firma)
      else o.firma
    end,
    org_nr = coalesce(o.org_nr, as_row.org_nr),
    selskap_adresse = coalesce(o.selskap_adresse, as_row.selskap_adresse),
    selskap_postnr = coalesce(o.selskap_postnr, as_row.selskap_postnr),
    selskap_sted = coalesce(o.selskap_sted, as_row.selskap_sted),
    selskap_telefon = coalesce(o.selskap_telefon, as_row.selskap_telefon),
    selskap_epost = coalesce(o.selskap_epost, as_row.selskap_epost),
    installator_navn = coalesce(o.installator_navn, as_row.installator_navn),
    installator_tittel = coalesce(o.installator_tittel, as_row.installator_tittel),
    installator_telefon = coalesce(o.installator_telefon, as_row.installator_telefon),
    installator_epost = coalesce(o.installator_epost, as_row.installator_epost);
end $$;
