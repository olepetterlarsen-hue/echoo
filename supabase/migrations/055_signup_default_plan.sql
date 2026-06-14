-- 055_signup_default_plan.sql
-- Bug-fix: signup_organization RPC (migration 039) ble laget før Stripe-
-- migrasjonen og kjenner ikke plan_tier eller subscription_status. Nye
-- orgs etter migration 053 fikk derfor NULL i disse feltene, som gjorde
-- at requireIsoPlan blokkerte ISO-modulene selv i trial.
--
-- Løsning: sett kolonne-defaults så alle nye inserts (uavhengig av RPC
-- eller direkte insert) får riktig startverdi.

alter table public.organizations
  alter column plan_tier set default 'trial',
  alter column subscription_status set default 'trialing';

-- Backfill eventuelle eksisterende NULL-rader fra mellomperioden.
update public.organizations
set
  plan_tier = coalesce(plan_tier, 'trial'),
  subscription_status = coalesce(subscription_status, 'trialing')
where plan_tier is null or subscription_status is null;
