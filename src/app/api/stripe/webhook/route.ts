import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { stripe, planFromSubscriptionItems } from "@/lib/stripe";
import { captureException } from "@/lib/observability";

/**
 * Stripe webhook. Raw body brukes til signaturverifisering.
 * Konfigurer endpoint i Stripe dashboard og legg signing secret i
 * STRIPE_WEBHOOK_SECRET.
 *
 * Eventer vi reagerer på:
 *   - checkout.session.completed: fest stripe_customer_id på org
 *   - customer.subscription.created / .updated: sync plan_tier, has_iso_addon,
 *     status, trial_ends_at
 *   - customer.subscription.deleted: marker canceled (men IKKE slett data —
 *     locked_at-flagget håndterer read-only)
 *   - invoice.payment_failed: status past_due → potensielt locked
 *   - invoice.payment_succeeded: klar locked_at hvis status nå er aktiv
 */

export const runtime = "nodejs"; // crypto.subtle for signaturverifisering

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !whSecret) {
    return new Response("Missing signature or secret", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, whSecret);
  } catch (e) {
    captureException(e, { context: "stripe-webhook-signature" });
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = await createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organization_id;
        const customerId = session.customer as string | null;
        if (orgId && customerId) {
          await admin
            .from("organizations")
            .update({ stripe_customer_id: customerId })
            .eq("id", orgId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Finn org via stripe_customer_id eller via metadata.organization_id
        let orgId: string | null = sub.metadata?.organization_id ?? null;
        if (!orgId) {
          const { data: org } = await admin
            .from("organizations")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();
          orgId = (org?.id as string | null) ?? null;
        }
        if (!orgId) {
          console.warn(
            "[stripe-webhook] Fant ikke org for customer",
            customerId,
          );
          break;
        }

        const { plan_tier, has_iso_addon } = planFromSubscriptionItems(
          sub.items.data,
        );
        const trial_ends_at = sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;

        const isCanceled = event.type === "customer.subscription.deleted";

        await admin
          .from("organizations")
          .update({
            stripe_subscription_id: isCanceled ? null : sub.id,
            subscription_status: isCanceled ? "canceled" : sub.status,
            plan_tier: isCanceled ? null : (plan_tier ?? "trial"),
            has_iso_addon: isCanceled ? false : has_iso_addon,
            trial_ends_at,
            // Hvis status er active/trialing fjern lock; ellers ikke rør
            locked_at:
              !isCanceled && (sub.status === "active" || sub.status === "trialing")
                ? null
                : undefined,
          })
          .eq("id", orgId);
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = inv.customer as string;
        const { data: org } = await admin
          .from("organizations")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (org) {
          await admin
            .from("organizations")
            .update({
              subscription_status: "past_due",
              locked_at: new Date().toISOString(),
            })
            .eq("id", org.id);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = inv.customer as string;
        const { data: org } = await admin
          .from("organizations")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (org) {
          await admin
            .from("organizations")
            .update({
              subscription_status: "active",
              locked_at: null,
            })
            .eq("id", org.id);

          // Provisjons-bokføring: idempotent. Returnerer 'already_recorded'
          // ved alle senere betalinger; UNIQUE(organization_id) i ledger-en
          // gjør funksjonen trygg å kalle for hver invoice.payment_succeeded.
          const { data: ledgerResult, error: ledgerErr } = await admin.rpc(
            "record_commission_sale",
            {
              p_organization_id: org.id,
              p_stripe_invoice_id: inv.id ?? null,
              p_stripe_payment_amount_ore: inv.amount_paid ?? null,
            },
          );
          if (ledgerErr) {
            captureException(ledgerErr, {
              context: "stripe-webhook-commission-ledger",
              orgId: org.id,
              invoiceId: inv.id,
            });
          } else if (ledgerResult === "recorded") {
            console.log(
              "[stripe-webhook] commission bokført for org",
              org.id,
              "invoice",
              inv.id,
            );
          }
        }
        break;
      }

      default:
        // Ignorer eventer vi ikke bryr oss om
        break;
    }
  } catch (e) {
    captureException(e, {
      context: "stripe-webhook-handler",
      eventType: event.type,
      eventId: event.id,
    });
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
