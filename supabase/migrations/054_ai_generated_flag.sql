-- 054_ai_generated_flag.sql
-- Sporbarhet: marker rader som er fylt ut med AI-assistanse, slik at vi
-- kan filtrere / vise dem i UI ("AI-utkast — sjekk før signering") og
-- holde compliance-trailen ren.
--
-- Følger samme mønster som custom_templates.ai_generated.

alter table public.deviations
  add column if not exists ai_generated boolean not null default false;

create index if not exists idx_deviations_org_ai_generated
  on public.deviations(organization_id, ai_generated)
  where ai_generated = true;
