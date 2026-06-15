-- 059_commission_ledger.sql
-- Provisjons-bokføring for Echoo-selgere. Garanterer at hver kunde
-- maks gir provisjon ÉN gang, og kun etter første betalingen er
-- gjennomført (Stripe invoice.payment_succeeded webhook).
--
-- Designprinsipp:
--   UNIQUE(organization_id) er sikkerhetsnett mot dobbel utbetaling.
--   Selv om webhook leverer samme event to ganger, eller hvis en
--   forsiktig admin manuelt prøver å legge til en rad — så vil
--   constraint-en avvise duplikatet.

create table if not exists public.commission_ledger (
  id uuid primary key default gen_random_uuid(),

  -- Hvem fikk salget tilegnet på betalingstidspunktet (kan endres etterpå
  -- i /team/salg, men ledger-raden husker hvem som tjente provisjonen)
  organization_id uuid not null unique
    references public.organizations(id) on delete restrict,
  salesperson_id uuid not null
    references public.profiles(id) on delete restrict,

  -- Stripe-evidens (audit trail) — eksakt invoice som utløste bokføringen
  stripe_invoice_id text,
  stripe_payment_amount_ore integer,     -- Stripe-beløp i øre

  -- Hva som ble bokført på provisjonen den måneden
  -- (kan være 0 hvis det var innenfor de 10 første salgene i mnd)
  payout_amount_nok numeric(10, 2) not null default 0,
  policy_snapshot jsonb,                 -- regelen som ble brukt (audit)

  -- Status: bokført → eventuelt utbetalt → eventuelt void (refundert/feil)
  status text not null default 'pending_payout',
  -- pending_payout | salary_covered | paid | void

  -- Utbetaling-tracking
  paid_at timestamptz,
  paid_by uuid references public.profiles(id),
  payout_ref text,                       -- bilag/lønnskøring/Tripletex-ref
  notes text,

  -- Den underliggende handlingen — når Stripe meldte at betalingen
  -- var gått gjennom (= det øyeblikket provisjonen ble fortjent)
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint commission_ledger_status_check check (
    status in ('pending_payout', 'salary_covered', 'paid', 'void')
  )
);

create index if not exists idx_commission_ledger_salesperson
  on public.commission_ledger(salesperson_id, confirmed_at desc);
create index if not exists idx_commission_ledger_status
  on public.commission_ledger(status);
create index if not exists idx_commission_ledger_paid_period
  on public.commission_ledger(salesperson_id, paid_at)
  where status = 'paid';

do $$ begin
  create trigger trg_commission_ledger_updated before update on public.commission_ledger
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.commission_ledger enable row level security;

-- Kun Echoo-staff (service_role i webhook). Vanlige kunder ser ingenting.
drop policy if exists commission_ledger_staff_all on public.commission_ledger;
create policy commission_ledger_staff_all on public.commission_ledger
  for all to authenticated
  using (public.is_echoo_staff())
  with check (public.is_echoo_staff());

------------------------------------------------------------------
-- record_commission_sale-funksjon: idempotent insert
-- Kalles av webhook ved invoice.payment_succeeded for første betaling.
-- UNIQUE(organization_id) sørger for at andre påfølgende kall blir
-- avvist (returnerer 'already_recorded').
------------------------------------------------------------------
create or replace function public.record_commission_sale(
  p_organization_id uuid,
  p_stripe_invoice_id text default null,
  p_stripe_payment_amount_ore integer default null
)
returns text                              -- 'recorded' | 'already_recorded' | 'no_assignment'
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salesperson_id uuid;
  v_this_month_count integer;
  v_amount numeric(10, 2);
  v_status text;
  v_existing_id uuid;
begin
  -- Allerede bokført? UNIQUE-en ville fanget oss, men vi sjekker først
  -- for å gi et tydelig retur-svar.
  select id into v_existing_id
  from public.commission_ledger
  where organization_id = p_organization_id;
  if v_existing_id is not null then
    return 'already_recorded';
  end if;

  -- Finn nåværende selger-tildeling
  select salesperson_id into v_salesperson_id
  from public.sales_assignments
  where organization_id = p_organization_id;
  if v_salesperson_id is null then
    return 'no_assignment';
  end if;

  -- Tell denne selgerens bekreftede salg denne måneden FØR denne
  v_this_month_count := (
    select count(*) from public.commission_ledger
    where salesperson_id = v_salesperson_id
      and confirmed_at >= date_trunc('month', now())
  );

  -- Policy: 10 første per måned er inkludert i fastlønn, deretter 500 kr
  if v_this_month_count >= 10 then
    v_amount := 500.00;
    v_status := 'pending_payout';
  else
    v_amount := 0.00;
    v_status := 'salary_covered';
  end if;

  insert into public.commission_ledger (
    organization_id, salesperson_id,
    stripe_invoice_id, stripe_payment_amount_ore,
    payout_amount_nok, policy_snapshot, status
  ) values (
    p_organization_id, v_salesperson_id,
    p_stripe_invoice_id, p_stripe_payment_amount_ore,
    v_amount,
    jsonb_build_object(
      'salary_includes_first', 10,
      'rate_per_extra_sale_nok', 500,
      'this_month_count_before', v_this_month_count
    ),
    v_status
  );

  return 'recorded';
end $$;

revoke execute on function public.record_commission_sale(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.record_commission_sale(uuid, text, integer)
  to service_role;

comment on function public.record_commission_sale is
  'Bokfører ett (1) provisjons-event per organisasjon. UNIQUE-constraint '
  'på organization_id sørger for at funksjonen er idempotent — kalles '
  'gjerne flere ganger uten konsekvens. Returnerer recorded | '
  'already_recorded | no_assignment.';
