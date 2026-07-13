-- AI-bruk / kostnadsbudsjett per bruker per måned.
--
-- Formål: hindre at én innlogget bruker kan kjøre opp en ubegrenset
-- Anthropic-regning ved å spamme AI-endepunktene (PDF-import, assistent osv.).
-- Appen sjekker ai_usage_this_month() FØR hvert AI-kall og avviser når
-- brukeren har passert månedsgrensen (håndheves i src/lib/ai/assistant.ts).
-- Etter hvert kall logges faktisk token-forbruk + estimert kostnad.
--
-- MERK: dette er et mykt tak (liten burst kan overskride ved mange
-- samtidige kall). Det harde taket er spend-grensen i Anthropic Console.

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null, -- 'YYYY-MM' i UTC
  request_count integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cost_usd numeric(12,4) not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, period)
);

create index if not exists idx_ai_usage_org_period
  on public.ai_usage(organization_id, period);

alter table public.ai_usage enable row level security;

-- Brukere kan lese egen orgs forbruk (for evt. UI-visning). Skriving skjer
-- kun via security-definer RPC under, aldri direkte.
drop policy if exists ai_usage_select_org on public.ai_usage;
create policy ai_usage_select_org on public.ai_usage
  for select using (organization_id = public.current_organization_id());

-- Hvor mye har innlogget bruker brukt (USD) inneværende måned.
create or replace function public.ai_usage_this_month()
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select cost_usd
       from public.ai_usage
      where user_id = auth.uid()
        and period = to_char(now() at time zone 'utc', 'YYYY-MM')),
    0
  );
$$;

-- Logg forbruk etter et AI-kall. Utleder bruker + org fra sesjonen, så en
-- bruker kan kun skrive sin egen rad (verste utfall: låser seg selv ute).
create or replace function public.record_ai_usage(
  p_input_tokens integer,
  p_output_tokens integer,
  p_cost numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.current_organization_id();
  v_user uuid := auth.uid();
  v_period text := to_char(now() at time zone 'utc', 'YYYY-MM');
begin
  if v_user is null or v_org is null then
    return; -- ingen sesjonskontekst → hopp over
  end if;

  insert into public.ai_usage (
    organization_id, user_id, period,
    request_count, input_tokens, output_tokens, cost_usd
  )
  values (
    v_org, v_user, v_period,
    1, greatest(p_input_tokens, 0), greatest(p_output_tokens, 0), greatest(p_cost, 0)
  )
  on conflict (user_id, period) do update set
    request_count = ai_usage.request_count + 1,
    input_tokens  = ai_usage.input_tokens + greatest(p_input_tokens, 0),
    output_tokens = ai_usage.output_tokens + greatest(p_output_tokens, 0),
    cost_usd      = ai_usage.cost_usd + greatest(p_cost, 0),
    updated_at    = now();
end;
$$;

revoke all on function public.ai_usage_this_month() from public, anon;
revoke all on function public.record_ai_usage(integer, integer, numeric) from public, anon;
grant execute on function public.ai_usage_this_month() to authenticated;
grant execute on function public.record_ai_usage(integer, integer, numeric) to authenticated;

notify pgrst, 'reload schema';
