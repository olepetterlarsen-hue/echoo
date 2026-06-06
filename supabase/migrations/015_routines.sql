-- Rutiner-bibliotek: standard elektrosikkerhetsprosedyrer (FSE/FEK/FEL/NEK).
-- Filer lagres i 'routines' bucket. Metadata om hver rutine i denne tabellen.
-- Standard 21 norske bransje-rutiner seedes som global referansebibliotek
-- (organization_id = NULL). Hver bedrift kan også laste opp egne ekstra
-- rutiner som blir org-scopet.

------------------------------------------------------------------
-- Storage bucket
------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('routines', 'routines', false)
on conflict (id) do nothing;

drop policy if exists "routines_select_authed" on storage.objects;
create policy "routines_select_authed" on storage.objects for select
  using (bucket_id = 'routines' and public.is_active());

drop policy if exists "routines_write_admin" on storage.objects;
create policy "routines_write_admin" on storage.objects for insert
  with check (bucket_id = 'routines' and public.is_admin());

drop policy if exists "routines_update_admin" on storage.objects;
create policy "routines_update_admin" on storage.objects for update
  using (bucket_id = 'routines' and public.is_admin());

drop policy if exists "routines_delete_admin" on storage.objects;
create policy "routines_delete_admin" on storage.objects for delete
  using (bucket_id = 'routines' and public.is_admin());

------------------------------------------------------------------
-- Metadata
------------------------------------------------------------------
create table if not exists public.routines (
  id serial primary key,
  number integer,                          -- 1, 2, 3 ... for ordering
  category text,                           -- f.eks. "FSE", "FEL", "Stillingsbeskrivelser"
  title_no text not null,
  title_en text not null,
  description_no text,
  description_en text,
  file_path_en text,                       -- storage path i 'routines' bucket
  file_path_no text,                       -- storage path for norsk versjon
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create trigger trg_routines_updated before update on public.routines
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.routines enable row level security;

drop policy if exists routines_select on public.routines;
create policy routines_select on public.routines
  for select using (public.is_active());

drop policy if exists routines_admin_write on public.routines;
create policy routines_admin_write on public.routines
  for all using (public.is_admin()) with check (public.is_admin());

------------------------------------------------------------------
-- Seed med 21 standard bransje-rutiner (norske elektroforskrifter).
------------------------------------------------------------------
insert into public.routines (number, category, title_no, title_en) values
  (1, 'FSE', 'Rutiner for årlig FSE elektrosikkerhetskurs og førstehjelpsopplæring (FSE § 7)', 'Routines for the annual FSE electrical safety course and first-aid training (FSE § 7)'),
  (2, 'FEK', 'Rutiner for evaluering av kompetanse og nødvendig utdanningskvalitet (FEK § 5 og § 7 FSE)', 'Routines for evaluating the competence and the necessary quality of education in the business (FEK § 5 and § 7 FSE)'),
  (3, 'FSE', 'Rutiner for lavspenningsleder (FSE § 6 og 12)', 'Routines for Low Voltage Safety Supervisors (FSE § 6 and 12)'),
  (4, 'FSE', 'Rutiner og prosedyrer for planlegging av arbeid på lavspenningsanlegg (FSE § 10)', 'Routines and procedures for planning work in low voltage installations (FSE § 10)'),
  (5, 'FSE', 'Rutiner og prosedyrer for arbeid på spenningsløse systemer (FSE § 14 og 15)', 'Routines and procedures for working on de-energized systems (FSE § 14 and 15)'),
  (6, 'FSE', 'Rutiner og prosedyrer for arbeid under spenning (FSE § 16)', 'Routines and procedures for live working (FSE § 16)'),
  (7, 'FSE', 'Rutiner og prosedyrer for arbeid i nærheten av spenningssatte deler (FSE § 17 og 18)', 'Routines and procedures for working in the vicinity of live parts (FSE § 17 and 18)'),
  (8, 'FSE', 'Rutiner for målearbeid og bruk av måleinstrumenter (FSE § 10, 14-19)', 'Routines for measurement work and using measuring instruments (FSE § 10, 14, 15, 16, 17, 18 and 19)'),
  (9, 'FSE', 'Retningslinjer for sikkerhetsutstyr og verneutstyr (FSE § 7)', 'Guidelines for safety equipment and protective equipment (FSE § 7)'),
  (10, 'Utstyr', 'Rutiner for innkjøp og bruk av elektrisk utstyr og materiell', 'Routines for the purchase and use of electrical equipment and materials'),
  (11, 'Utstyr', 'Rutiner for bruk av elektrisk utstyr og tiltak for å forebygge elektrisk støt', 'Routines for the use of electrical equipment and measures to prevent electric shock'),
  (12, 'Utstyr', 'Rutiner for arbeid med elektrisk utstyr i spenningsatte avgrensede områder (NEK 400-7-706)', 'Routines for working with electrical equipment in energised restricted areas (NEK 400-7-706)'),
  (13, 'FEL', 'FEL § 12 — Prosedyrer for samsvarserklæring av lavspenningsanlegg', 'FEL § 12 Procedures for declaration of conformity of low voltage installations'),
  (14, 'FEL', 'FEL § 16 — Prosedyrer for risikovurdering av installasjonsarbeid i lavspenning', 'FEL § 16 Procedures for risk assessment of installation work in low voltage'),
  (15, 'FEL', 'FEL § 12 — Prosedyrer for sluttkontroll og verifikasjon av lavspenningsinstallasjoner', 'FEL § 12 Procedures for final inspection — verification of electrical installation work in low voltage'),
  (16, 'Dokumentasjon', 'Prosedyrer for utstyrsdokumentasjon, brukermanualer, kursfortegnelse og dokumentasjon av elektriske installasjoner', 'Procedures for equipment documentation, user manuals, electric circuit and documentation of electrical installations'),
  (17, 'Tilkobling', 'Rutine og prosedyre for tilkobling av forsyning til maskin levert iht. maskindirektivet', 'Routine and procedure for connecting the supply to the machine delivered acc. machinery directive'),
  (18, 'Stillinger', 'Stillingsbeskrivelse for lærlinger', 'Job description for apprentices'),
  (19, 'Stillinger', 'Stillingsbeskrivelse for hjelpearbeidere', 'Job description for aid workers'),
  (20, 'Stillinger', 'Stillingsbeskrivelse for elektrofagarbeidere', 'Job description for employee electro professionals'),
  (21, 'Produktsikkerhet', 'Rutine og instruksjoner for produkt- og forbrukertjenestesikkerhet (DSB)', 'Routine and instructions for concern for products and consumer services (DSB)')
on conflict do nothing;
