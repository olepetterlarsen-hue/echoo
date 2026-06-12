-- 053_stripe_subscriptions.sql
-- Stripe-abonnementsstate på organizations.
--
-- Tiers:
--   trial         — første 14 dager, full tilgang
--   elektro_hms   — base plan 2990 kr/mnd
--   (has_iso_addon = true legger til ISO 9001-modul +2000 kr/mnd)
--
-- Status-felter speiler Stripe-subscription.status:
--   trialing | active | past_due | unpaid | canceled | incomplete | ...
-- locked_at settes når access skal være read-only. Data slettes ALDRI;
-- reaktivering nullstiller locked_at og gjenoppretter full tilgang.

alter table public.organizations
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists has_iso_addon boolean not null default false,
  add column if not exists plan_tier text,                    -- 'trial' | 'elektro_hms'
  add column if not exists locked_at timestamptz,
  add column if not exists storage_used_bytes bigint not null default 0;

create unique index if not exists organizations_stripe_customer_idx
  on public.organizations(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists organizations_stripe_subscription_idx
  on public.organizations(stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Sett alle eksisterende orgs til 'trial' med trial_ends_at = +14 dager hvis ikke satt
update public.organizations
set
  plan_tier = coalesce(plan_tier, 'trial'),
  subscription_status = coalesce(subscription_status, 'trialing'),
  trial_ends_at = coalesce(trial_ends_at, now() + interval '14 days');

comment on column public.organizations.locked_at is
  'Settes når abonnementet er utløpt/forfalt og access skal være read-only. '
  'Data beholdes — nullstilles ved reaktivering. NEVER NULL = aldri slett.';

comment on column public.organizations.has_iso_addon is
  'Når true: ISO 9001-modulen er tilgjengelig (mål, revisjon, mgmt review etc).';

------------------------------------------------------------------
-- Helper for å sjekke om en org er locked og hvor mye lagring er brukt.
------------------------------------------------------------------
create or replace function public.is_org_locked(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(locked_at, '1900-01-01'::timestamptz) > '1900-01-01'::timestamptz
  from public.organizations where id = p_org_id;
$$;

revoke execute on function public.is_org_locked(uuid) from public, anon;
grant execute on function public.is_org_locked(uuid) to authenticated;

------------------------------------------------------------------
-- storage_used_bytes oppdateres av webhook (sjeldnere enn live-tracking).
-- For live-quota-sjekk har vi en helper som regner ut faktisk forbruk på
-- forespørsel.
------------------------------------------------------------------
create or replace function public.recalc_org_storage(p_org_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_total bigint;
begin
  select coalesce(sum((metadata->>'size')::bigint), 0)
  into v_total
  from storage.objects
  where bucket_id in (
        'certificates', 'documents', 'project-files', 'substance-sds',
        'org-logos', 'org-imports'
      )
    and public.storage_object_org_id(bucket_id, name) = p_org_id;

  update public.organizations set storage_used_bytes = v_total where id = p_org_id;
  return v_total;
end $$;

revoke execute on function public.recalc_org_storage(uuid) from public, anon;
grant execute on function public.recalc_org_storage(uuid) to authenticated, service_role;
