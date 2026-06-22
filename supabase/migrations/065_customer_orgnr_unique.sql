-- 065_customer_orgnr_unique.sql
-- Unik orgnr per organisasjon — én tenant kan ikke ha samme firmakunde to ganger.
-- Bruker partial index slik at NULL/tomme verdier (typisk for privatkunder)
-- ikke kolliderer.

create unique index if not exists customers_orgnr_unique_per_org
  on public.customers (organization_id, org_number)
  where org_number is not null and length(trim(org_number)) > 0;

comment on index public.customers_orgnr_unique_per_org is
  'Hindrer duplikate orgnumre per organisasjon. Tillater flere privatkunder uten orgnr.';
