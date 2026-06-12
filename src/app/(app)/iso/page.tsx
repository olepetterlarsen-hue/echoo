import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  AlertTriangle,
  ClipboardCheck,
  Users,
  Target,
  Leaf,
  Scale,
  ArrowRight,
} from "lucide-react";

export default async function IsoLandingPage() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const [
    { count: docsInReview },
    { count: openCapa },
    { count: openAudits },
    { count: scheduledReviews },
    { count: openObjectives },
    { count: nonCompliant },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "under_review"),
    supabase
      .from("deviations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .neq("status", "lukket"),
    supabase
      .from("audit_plans")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("status", ["planned", "in_progress"]),
    supabase
      .from("management_reviews")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "scheduled"),
    supabase
      .from("iso_objectives")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "active"),
    supabase
      .from("compliance_obligations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "non_compliant"),
  ]);

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">ISO 9001 / 14001</h1>
        <p className="text-text-2 text-sm">
          Kvalitets- og miljøstyringsmoduler for sertifisering.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Tile
          href="/iso/dokumentstyring"
          icon={<ClipboardList className="size-5" />}
          title="Dokumentstyring"
          desc="Godkjenningsflyt for skjemaer og prosedyrer (ISO 9001 7.5)."
          count={docsInReview ?? 0}
          countLabel="til gjennomgang"
        />
        <Tile
          href="/avvik"
          icon={<AlertTriangle className="size-5" />}
          title="CAPA / Avvik"
          desc="Rotårsak, korrektive tiltak, verifikasjon (10.2)."
          count={openCapa ?? 0}
          countLabel="åpne"
          tone={openCapa && openCapa > 0 ? "orange" : "neutral"}
        />
        <Tile
          href="/iso/revisjoner"
          icon={<ClipboardCheck className="size-5" />}
          title="Internrevisjon"
          desc="Revisjonsplaner, sjekklister, funn (9.2)."
          count={openAudits ?? 0}
          countLabel="pågående"
        />
        <Tile
          href="/iso/ledelsens-gjennomgang"
          icon={<Users className="size-5" />}
          title="Ledelsens gjennomgang"
          desc="Periodisk gjennomgang med automatisk input-snapshot (9.3)."
          count={scheduledReviews ?? 0}
          countLabel="planlagt"
        />
        <Tile
          href="/iso/maal"
          icon={<Target className="size-5" />}
          title="Mål og KPI"
          desc="Kvalitets- og miljømål med målinger (6.2)."
          count={openObjectives ?? 0}
          countLabel="aktive"
        />
        <Tile
          href="/iso/miljoaspekter"
          icon={<Leaf className="size-5" />}
          title="Miljøaspekter"
          desc="Aspekter med signifikans-scoring (14001 6.1.2)."
        />
        <Tile
          href="/iso/etterlevelse"
          icon={<Scale className="size-5" />}
          title="Etterlevelse"
          desc="Lover, forskrifter, evidens (14001 6.1.3)."
          count={nonCompliant ?? 0}
          countLabel="ikke etterlevd"
          tone={nonCompliant && nonCompliant > 0 ? "red" : "neutral"}
        />
      </div>
    </div>
  );
}

function Tile({
  href,
  icon,
  title,
  desc,
  count,
  countLabel,
  tone = "neutral",
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  count?: number;
  countLabel?: string;
  tone?: "neutral" | "orange" | "red";
}) {
  return (
    <Link href={href} className="block group">
      <Card className="h-full hover:bg-card-hover transition-colors">
        <CardBody className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="size-9 rounded-md bg-orange/15 text-orange grid place-items-center shrink-0">
              {icon}
            </div>
            {count !== undefined && countLabel && (
              <Badge
                tone={tone === "red" ? "red" : tone === "orange" ? "orange" : "neutral"}
              >
                {count} {countLabel}
              </Badge>
            )}
          </div>
          <div>
            <h2 className="font-semibold text-text-1 group-hover:text-orange transition-colors">
              {title}
            </h2>
            <p className="text-sm text-text-2 mt-1">{desc}</p>
          </div>
          <div className="text-xs text-text-3 group-hover:text-orange flex items-center gap-1">
            Åpne <ArrowRight className="size-3" />
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
