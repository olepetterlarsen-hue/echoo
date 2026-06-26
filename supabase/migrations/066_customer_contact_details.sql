-- 066_customer_contact_details.sql
-- Utvider kontaktperson-info på kunder med rolle, alt. mobil og adresse.
-- Bruker (Erik Volt) ba om dette: per i dag har vi kun contact_person + email +
-- phone, men brukerne trenger også rolle ("Byggeleder"), privat-adresse og
-- alt. mobilnummer for den personen.
--
-- Bevisst valg: holder oss til enkelt-rad-modell (felter direkte på customers)
-- i stedet for separat customer_contacts-tabell. Hvis flere kontakter trengs
-- per kunde senere, lager vi en relasjonstabell da.

alter table public.customers
  add column if not exists contact_person_role text,
  add column if not exists contact_person_phone_alt text,
  add column if not exists contact_person_address text;

comment on column public.customers.contact_person_role is
  'Rolle/tittel for kontaktpersonen, f.eks. "Prosjektleder", "Byggeleder".';
comment on column public.customers.contact_person_phone_alt is
  'Alternativt telefonnummer for kontaktpersonen (privat mobil e.l.).';
comment on column public.customers.contact_person_address is
  'Privat adresse for kontaktpersonen, brukes hvis ulik fra firmaadresse.';
