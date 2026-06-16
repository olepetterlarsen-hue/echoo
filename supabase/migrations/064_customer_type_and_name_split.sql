-- 064_customer_type_and_name_split.sql
-- Privat-/bedriftskunde-toggle + separate fornavn/etternavn-felt.
-- Bedrift har "name" (firmanavn), privat har first_name + last_name.
-- Eksisterende rader får default "bedrift" + name beholdes — ingen
-- bakoverkompatibilitets-brudd.

do $$ begin
  create type customer_type as enum ('bedrift', 'privat');
exception when duplicate_object then null; end $$;

alter table public.customers
  add column if not exists customer_type customer_type not null default 'bedrift';

alter table public.customers
  add column if not exists first_name text,
  add column if not exists last_name text;

-- For privatkunder: visningsnavn deriveres fra first_name + last_name.
-- For bedrifter: name brukes som før. UI håndterer dette.

comment on column public.customers.customer_type is
  'bedrift = firmakunde med org_number. privat = privatperson med first_name + last_name.';
comment on column public.customers.first_name is
  'Brukes når customer_type = privat. NULL for bedrift.';
comment on column public.customers.last_name is
  'Brukes når customer_type = privat. NULL for bedrift.';
