"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe, STRIPE_PRICE_BASE, STRIPE_PRICE_ISO_ADDON } from "@/lib/stripe";
import { getAppOrigin } from "@/lib/origin";

// Kampanjekoder som forlenger gratis prøveperiode ved checkout. Verdien er
// antall dager før første betaling ("vaskedag" = betaling starter 30 dager
// etter checkout). Koden skrives inn i abonnement-siden, valideres server-side.
const CAMPAIGN_TRIAL_DAYS: Record<string, number> = {
  vaskedag: 30,
};

function campaignTrialDays(code?: string): number | undefined {
  if (!code) return undefined;
  return CAMPAIGN_TRIAL_DAYS[code.trim().toLowerCase()];
}

async function requireAdminOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Ikke innlogget");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Krever admin");
  if (!profile.organization_id) throw new Error("Mangler organisasjon");
  return { supabase, user, orgId: profile.organization_id as string };
}


/**
 * Oppretter en Stripe Checkout-session for ny eller utvidet subscription.
 * include_iso = true legger ISO 9001-modulen som linje i samme subscription.
 */
export async function startCheckout(args: {
  include_iso?: boolean;
  campaign_code?: string;
}): Promise<{ url?: string; error?: string }> {
  let ctx;
  try {
    ctx = await requireAdminOrg();
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!STRIPE_PRICE_BASE) {
    return {
      error:
        "Stripe-priser er ikke konfigurert. Kjør `npm run stripe:setup`.",
    };
  }
  if (args.include_iso && !STRIPE_PRICE_ISO_ADDON) {
    return {
      error:
        "ISO-add-on-pris mangler. Kjør `npm run stripe:setup`.",
    };
  }

  const { data: org } = await ctx.supabase
    .from("organizations")
    .select("firma, stripe_customer_id, selskap_epost, trial_ends_at")
    .eq("id", ctx.orgId)
    .single();
  if (!org) return { error: "Fant ikke organisasjon." };

  const origin = await getAppOrigin();
  const lineItems: { price: string; quantity: number }[] = [
    { price: STRIPE_PRICE_BASE, quantity: 1 },
  ];
  if (args.include_iso && STRIPE_PRICE_ISO_ADDON) {
    lineItems.push({ price: STRIPE_PRICE_ISO_ADDON, quantity: 1 });
  }

  // Hvis vi allerede har et Stripe-customer-id, gjenbruk
  const customerArgs: { customer?: string; customer_email?: string } = {};
  if (org.stripe_customer_id) {
    customerArgs.customer = org.stripe_customer_id;
  } else {
    customerArgs.customer_email = org.selskap_epost ?? ctx.user.email ?? undefined;
  }

  // Trial gjelder bare hvis vi ikke har brukt opp 14 dager allerede.
  // Stripe Checkout tar et explicit trial-period i dager (gjelder kun
  // subscription_data) — vi setter resterende dager (max 14).
  let trial_period_days: number | undefined = undefined;
  if (org.trial_ends_at) {
    const remainingMs =
      new Date(org.trial_ends_at).getTime() - Date.now();
    const days = Math.floor(remainingMs / (24 * 3600 * 1000));
    if (days > 0) trial_period_days = Math.min(days, 14);
  } else {
    trial_period_days = 14;
  }

  // Kampanjekode overstyrer trial oppover (aldri nedover): "vaskedag" gjør at
  // første betaling først skjer 30 dager etter checkout.
  const campaignDays = campaignTrialDays(args.campaign_code);
  if (campaignDays) {
    trial_period_days = Math.max(trial_period_days ?? 0, campaignDays);
  }

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      ...customerArgs,
      // Vis "Add promotion code"-felt i Checkout. Aktive promo-koder
      // (f.eks. 60DAGER for 60 dager gratis) opprettes i Stripe Dashboard
      // eller via API.
      allow_promotion_codes: true,
      // Norsk mva: prisene er satt eks. mva (tax_behavior=exclusive),
      // Stripe Tax legger på 25 % basert på kundens adresse.
      // Krever at kunden fyller inn adresse i Checkout.
      automatic_tax: { enabled: true },
      customer_update: org.stripe_customer_id
        ? { address: "auto", name: "auto" }
        : undefined,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      line_items: lineItems,
      success_url: `${origin}/onboarding/velkommen`,
      cancel_url: `${origin}/admin/abonnement?status=cancel`,
      metadata: { organization_id: ctx.orgId },
      subscription_data: {
        metadata: { organization_id: ctx.orgId },
        ...(trial_period_days ? { trial_period_days } : {}),
      },
    });
    if (!session.url) return { error: "Stripe returnerte ingen URL." };
    return { url: session.url };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function openPortal(): Promise<{ url?: string; error?: string }> {
  let ctx;
  try {
    ctx = await requireAdminOrg();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { data: org } = await ctx.supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", ctx.orgId)
    .single();
  if (!org?.stripe_customer_id) {
    return { error: "Ingen Stripe-kunde knyttet. Start abonnement først." };
  }
  const origin = await getAppOrigin();
  try {
    const portal = await stripe().billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${origin}/admin/abonnement`,
    });
    return { url: portal.url };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Redirect-helper som kalles fra en form: starter Checkout og redirecter.
 */
export async function checkoutAndRedirect(formData: FormData) {
  const include_iso = formData.get("include_iso") === "1";
  const campaign_code = (formData.get("campaign_code") as string) || undefined;
  const res = await startCheckout({ include_iso, campaign_code });
  if (res.error || !res.url) {
    throw new Error(res.error ?? "Klarte ikke starte Checkout.");
  }
  redirect(res.url);
}

export async function portalAndRedirect() {
  const res = await openPortal();
  if (res.error || !res.url) {
    throw new Error(res.error ?? "Klarte ikke åpne kundeportal.");
  }
  redirect(res.url);
}
