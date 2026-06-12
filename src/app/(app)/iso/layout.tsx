import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock } from "lucide-react";

/**
 * Server-side ISO feature gate.
 *
 * ISO 9001 / 14001-modulene krever enten:
 *   - aktiv subscription med has_iso_addon = true
 *   - eller pågående prøveperiode (trial inkluderer alt)
 *
 * Andre brukere får en oppgrader-skjerm i stedet for ISO-innholdet.
 * Read-actions er trygge på RLS, men UI-en peker tydelig mot
 * /admin/abonnement.
 */
export default async function IsoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "subscription_status, has_iso_addon, plan_tier, locked_at, trial_ends_at",
    )
    .eq("id", orgId)
    .single();

  const trialActive =
    org?.subscription_status === "trialing" ||
    (org?.plan_tier === "trial" &&
      org.trial_ends_at &&
      new Date(org.trial_ends_at).getTime() > Date.now());

  const isoAvailable =
    !!org && !org.locked_at && (trialActive || !!org.has_iso_addon);

  if (!isoAvailable) {
    return (
      <div className="px-6 py-12 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardBody className="space-y-4 text-center">
            <div className="size-12 rounded-full bg-orange/15 text-orange grid place-items-center mx-auto">
              <ShieldCheck className="size-6" />
            </div>
            <h1 className="text-xl font-semibold">
              ISO 9001-modul kreves
            </h1>
            <p className="text-sm text-text-2">
              Dette innholdet er en del av ISO 9001 / 14001-modulen. Legg den
              til på abonnementet ditt for +2 000 kr/mnd.
            </p>
            {org?.locked_at && (
              <div className="flex items-start gap-2 bg-red/10 border border-red/30 rounded-md px-3 py-2 text-sm text-red text-left">
                <Lock className="size-4 mt-0.5 shrink-0" />
                <span>
                  Kontoen er låst — fullfør betaling i kundeportalen før du
                  kan oppgradere.
                </span>
              </div>
            )}
            <Link href="/admin/abonnement">
              <Button>Se abonnement</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
