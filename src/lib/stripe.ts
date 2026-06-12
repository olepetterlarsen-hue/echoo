import Stripe from "stripe";

let _client: Stripe | null = null;

export function stripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY mangler.");
  }
  _client = new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
  return _client;
}

export const STRIPE_PRICE_BASE = process.env.STRIPE_PRICE_BASE;
export const STRIPE_PRICE_ISO_ADDON = process.env.STRIPE_PRICE_ISO_ADDON;

/**
 * Mapper subscription items til vårt interne plan-state.
 */
export function planFromSubscriptionItems(
  items: Stripe.Subscription["items"]["data"],
): {
  plan_tier: "elektro_hms" | null;
  has_iso_addon: boolean;
} {
  let plan_tier: "elektro_hms" | null = null;
  let has_iso_addon = false;
  for (const it of items) {
    const priceId = it.price.id;
    if (priceId === STRIPE_PRICE_BASE) {
      plan_tier = "elektro_hms";
    } else if (priceId === STRIPE_PRICE_ISO_ADDON) {
      has_iso_addon = true;
    }
  }
  return { plan_tier, has_iso_addon };
}

/**
 * Vurdér om en org skal være locked basert på subscription_status og
 * trial_ends_at. Trial-utløp uten betalt abonnement = lock.
 */
export function shouldLockOrg(args: {
  subscription_status: string | null;
  trial_ends_at: string | null;
  plan_tier: string | null;
}): boolean {
  const { subscription_status, trial_ends_at, plan_tier } = args;
  if (
    subscription_status === "active" ||
    subscription_status === "trialing"
  ) {
    return false;
  }
  if (
    subscription_status === "past_due" ||
    subscription_status === "unpaid" ||
    subscription_status === "canceled" ||
    subscription_status === "incomplete_expired"
  ) {
    return true;
  }
  // Ingen subscription ennå — kun OK hvis fortsatt i trial-perioden
  if (plan_tier === "trial" || plan_tier === null) {
    if (!trial_ends_at) return true;
    return new Date(trial_ends_at).getTime() < Date.now();
  }
  return true;
}
