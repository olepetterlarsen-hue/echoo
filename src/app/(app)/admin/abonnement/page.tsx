import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import {
  checkoutAndRedirect,
  portalAndRedirect,
  startCheckout,
} from "./actions";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    prefill?: string;
    auto_checkout?: string;
  }>;
}

export default async function AbonnementPage({ searchParams }: PageProps) {
  const {
    status: flash,
    prefill: rawPrefill,
    auto_checkout,
  } = await searchParams;
  const prefill: "base" | "iso" | undefined =
    rawPrefill === "base" || rawPrefill === "iso" ? rawPrefill : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) redirect("/dashboard");

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "firma, plan_tier, subscription_status, has_iso_addon, trial_ends_at, locked_at, stripe_customer_id",
    )
    .eq("id", profile.organization_id)
    .single();
  if (!org) redirect("/dashboard");

  // Auto-redirect rett til Stripe Checkout hvis bruker kom via
  // landingsside-link og ikke har et aktivt abonnement ennå.
  if (
    auto_checkout === "1" &&
    prefill &&
    !org.stripe_customer_id &&
    org.subscription_status !== "active"
  ) {
    const res = await startCheckout({ include_iso: prefill === "iso" });
    if (res.url) {
      redirect(res.url);
    }
    // Hvis Checkout feilet, fall gjennom til normal side med feilmelding.
  }

  // Server component — Date.now() er trygg her (kjører én gang per request).
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const trialRemainingDays = org.trial_ends_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(org.trial_ends_at).getTime() - nowMs) / (24 * 3600 * 1000),
        ),
      )
    : 0;

  const hasActiveSub =
    org.subscription_status === "active" ||
    org.subscription_status === "trialing";

  const inTrial =
    !org.stripe_customer_id &&
    org.subscription_status !== "active" &&
    trialRemainingDays > 0;

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Abonnement</h1>
        <p className="text-text-2 text-sm">
          {org.firma} — administrer abonnement og fakturering.
        </p>
      </header>

      {flash === "success" && (
        <div className="flex items-start gap-2 bg-green/10 border border-green/30 rounded-md px-3 py-2 text-sm text-green">
          <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
          Takk! Status oppdateres når Stripe-webhook bekrefter.
        </div>
      )}

      {/* Trial-banner: fremhever at bruker har full tilgang gratis i prøveperioden */}
      {inTrial && (
        <Card>
          <CardBody className="bg-orange/5 border-l-4 border-orange space-y-1">
            <div className="text-base font-semibold text-orange">
              Du tester Echoo gratis i {trialRemainingDays}{" "}
              {trialRemainingDays === 1 ? "dag" : "dager"} til
            </div>
            <p className="text-sm text-text-2">
              Du har full tilgang til alt i prøveperioden — ingen betaling
              kreves før du velger å fortsette. Du kan abonnere når som helst
              med knappene nederst på siden.
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-text-3">
                Status
              </div>
              <div className="text-lg font-medium mt-0.5">
                {labelStatus(org.subscription_status, org.plan_tier)}
                {org.locked_at && (
                  <Badge tone="red" className="ml-2">
                    Låst
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              {org.has_iso_addon && (
                <Badge tone="orange">ISO 9001-modul</Badge>
              )}
            </div>
          </div>

          {org.locked_at && (
            <div className="flex items-start gap-2 bg-yellow/10 border border-yellow/30 rounded-md px-3 py-2 text-sm text-yellow">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <div>
                Tilgangen er begrenset til lesing inntil abonnementet er
                betalt. Data slettes aldri — fullfør betaling i Stripe-portalen
                for å gjenåpne.
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pakkene — bevisst lagt opp som "basis-pakke" + "valgfritt tillegg"
          for at brukerne skal forstå at ISO ikke er obligatorisk */}
      <div className="space-y-3">
        <div className="text-sm text-text-2">
          Echoo har én basis-pakke som dekker det daglige elektroarbeidet, og
          en valgfri ISO-modul du kan slå på når du har behov for et formelt
          kvalitetssystem.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Basis-pakke</h3>
                <Badge tone="orange">Anbefalt for alle</Badge>
              </div>
              <div className="text-xs text-text-3">Echoo Elektro + HMS</div>
              <div className="text-2xl font-semibold">
                2 990 kr<span className="text-sm font-normal text-text-3">/mnd</span>
              </div>
              <ul className="text-sm text-text-2 space-y-1 list-disc list-inside">
                <li>Prosjekter, avvik, dokumentsignering</li>
                <li>Kompetanse og stoffkartotek</li>
                <li>Rutiner og HMS-håndbok</li>
                <li>Ubegrenset antall brukere</li>
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  ISO 9001-modul
                </h3>
                <Badge tone="neutral">Valgfritt tillegg</Badge>
              </div>
              <div className="text-xs text-text-3">
                Krever basis-pakke. Kan slås på/av når som helst.
              </div>
              <div className="text-2xl font-semibold">
                +2 000 kr<span className="text-sm font-normal text-text-3">/mnd</span>
              </div>
              <ul className="text-sm text-text-2 space-y-1 list-disc list-inside">
                <li>Dokumentstyringsflyt (under_review → approved)</li>
                <li>CAPA-prosess på avvik</li>
                <li>Internrevisjon + ledelsens gjennomgang</li>
                <li>Mål-/KPI-register + miljøaspekter + etterlevelse</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <h3 className="font-semibold">
            {!org.stripe_customer_id ? "Klar til å abonnere?" : "Endre abonnement"}
          </h3>
          {!org.stripe_customer_id ? (
            <>
              <p className="text-sm text-text-2">
                Velg om du vil starte med basis-pakken alene eller inkludere
                ISO-modulen fra dag én. Du kan endre dette når som helst senere.
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={checkoutAndRedirect}>
                  <Button
                    type="submit"
                    variant={prefill === "iso" ? "secondary" : "primary"}
                  >
                    Abonner — kun basis-pakke
                  </Button>
                </form>
                <form action={checkoutAndRedirect}>
                  <input type="hidden" name="include_iso" value="1" />
                  <Button
                    type="submit"
                    variant={prefill === "iso" ? "primary" : "secondary"}
                  >
                    Abonner — basis + ISO-modul
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-text-2">
                Bytt plan, oppdater betalingsmiddel eller last ned fakturaer
                i Stripe-portalen.
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={portalAndRedirect}>
                  <Button type="submit">Åpne kundeportal</Button>
                </form>
                {!org.has_iso_addon && (
                  <form action={checkoutAndRedirect}>
                    <input type="hidden" name="include_iso" value="1" />
                    <Button type="submit" variant="secondary">
                      Legg til ISO-modul
                    </Button>
                  </form>
                )}
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function labelStatus(status: string | null, tier: string | null): string {
  if (!status && !tier) return "—";
  if (status === "trialing") return "Prøveperiode";
  if (status === "active") {
    if (tier === "elektro_hms") return "Echoo Elektro + HMS";
    return "Aktiv";
  }
  if (status === "past_due") return "Forfalt betaling";
  if (status === "canceled") return "Avsluttet";
  if (status === "unpaid") return "Ubetalt";
  return status ?? tier ?? "—";
}
