import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SEVERITY_LABELS,
  DEVIATION_STATUS_LABELS,
} from "@/lib/types/database";
import { getServerT } from "@/lib/i18n/server";
import { CapaForm } from "./capa-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DeviationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);
  const { locale } = await getServerT();

  const { data: devRaw } = await supabase
    .from("deviations")
    .select(
      "*, project:projects(id, project_number, title), reported_by_profile:profiles!deviations_reported_by_fkey(full_name), assigned_to_profile:profiles!deviations_assigned_to_fkey(full_name), responsible:profiles!deviations_responsible_id_fkey(full_name), verified_by_profile:profiles!deviations_verified_by_fkey(full_name)",
    )
    .eq("organization_id", orgId)
    .eq("id", id)
    .single();
  if (!devRaw) notFound();
  // Typegen kjenner ikke alle FK-pathene mot profiles ennå — vi caster:
  const dev = devRaw as unknown as {
    id: string;
    title: string;
    description: string | null;
    severity: "lav" | "middels" | "hoey" | "kritisk";
    status: "apen" | "under_arbeid" | "lukket";
    project_id: string;
    project: { id: string; project_number: string; title: string } | null;
    root_cause_category: import("@/lib/types/database").DeviationRootCauseCategory | null;
    root_cause_description: string | null;
    containment_action: string | null;
    containment_at: string | null;
    corrective_action: string | null;
    responsible_id: string | null;
    due_date: string | null;
    verification_evidence: string | null;
    verified_at: string | null;
    verified_by_profile: { full_name: string | null } | null;
  };

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("organization_id", orgId)
    .eq("active", true)
    .order("full_name");

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <Link href="/avvik" className="text-xs text-text-3 hover:text-orange">
          ← Tilbake til avvik
        </Link>
        <div className="flex items-start justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl font-semibold">{dev.title}</h1>
            {dev.project && (
              <Link
                href={`/prosjekter/${dev.project.id}`}
                className="text-sm text-text-3 hover:text-orange"
              >
                {dev.project.project_number} · {dev.project.title}
              </Link>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge
              tone={
                dev.severity === "kritisk"
                  ? "red"
                  : dev.severity === "hoey"
                    ? "orange"
                    : dev.severity === "middels"
                      ? "yellow"
                      : "neutral"
              }
            >
              {SEVERITY_LABELS[dev.severity][locale]}
            </Badge>
            <Badge
              tone={
                dev.status === "apen"
                  ? "red"
                  : dev.status === "under_arbeid"
                    ? "yellow"
                    : "green"
              }
            >
              {DEVIATION_STATUS_LABELS[dev.status][locale]}
            </Badge>
          </div>
        </div>
      </header>

      {dev.description && (
        <Card>
          <CardBody>
            <h2 className="text-sm font-semibold text-text-3 uppercase tracking-wider mb-2">
              Beskrivelse
            </h2>
            <p className="text-sm text-text-1 whitespace-pre-wrap">
              {dev.description}
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold">CAPA — korrigerende tiltak</h2>
          <p className="text-xs text-text-3 mt-0.5">
            ISO 9001 10.2: rotårsak, containment, korrektive tiltak,
            verifikasjon. Avviket kan ikke lukkes før verifikasjon er
            fullført.
          </p>
        </div>
        <CardBody>
          <CapaForm
            deviationId={id}
            initial={{
              root_cause_category: dev.root_cause_category,
              root_cause_description: dev.root_cause_description,
              containment_action: dev.containment_action,
              containment_at: dev.containment_at,
              corrective_action: dev.corrective_action,
              responsible_id: dev.responsible_id,
              due_date: dev.due_date,
              verification_evidence: dev.verification_evidence,
              verified_at: dev.verified_at,
              verified_by_name: dev.verified_by_profile?.full_name ?? null,
            }}
            profiles={profiles ?? []}
          />
        </CardBody>
      </Card>
    </div>
  );
}
