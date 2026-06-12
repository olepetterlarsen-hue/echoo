import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddFindingForm } from "./add-finding-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AuditPlanDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const { data: planRaw } = await supabase
    .from("audit_plans")
    .select(
      "*, auditor:profiles!audit_plans_auditor_id_fkey(full_name), checklist_template:audit_checklist_templates(id, name, definition)",
    )
    .eq("organization_id", orgId)
    .eq("id", id)
    .single();
  if (!planRaw) notFound();
  const plan = planRaw as unknown as {
    id: string;
    title: string;
    scope: string;
    status: string;
    planned_date: string;
    completed_date: string | null;
    external_auditor_name: string | null;
    auditor: { full_name: string | null } | null;
  };

  const { data: findingsRaw } = await supabase
    .from("audit_findings")
    .select(
      "*, linked_deviation:deviations(id, title, status)",
    )
    .eq("audit_plan_id", id)
    .order("created_at", { ascending: false });
  const findings = findingsRaw as unknown as Array<{
    id: string;
    title: string;
    description: string | null;
    severity: string;
    reference: string | null;
    linked_deviation: { id: string; title: string; status: string } | null;
  }> | null;

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <Link
          href="/iso/revisjoner"
          className="text-xs text-text-3 hover:text-orange"
        >
          ← Tilbake til revisjoner
        </Link>
        <h1 className="text-2xl font-semibold mt-1">{plan.title}</h1>
        <p className="text-text-2 text-sm">{plan.scope}</p>
      </header>

      <Card>
        <CardBody className="grid grid-cols-2 gap-4 text-sm">
          <Stat label="Status" value={plan.status} />
          <Stat label="Planlagt" value={plan.planned_date} />
          <Stat label="Fullført" value={plan.completed_date ?? "—"} />
          <Stat
            label="Auditor"
            value={plan.auditor?.full_name ?? plan.external_auditor_name ?? "—"}
          />
        </CardBody>
      </Card>

      <Card>
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold">Funn ({findings?.length ?? 0})</h2>
        </div>
        <CardBody className="!p-0">
          {findings && findings.length > 0 ? (
            <ul className="divide-y divide-border">
              {findings.map((f) => (
                <li key={f.id} className="px-5 py-3">
                  <div className="flex items-start gap-3">
                    <SeverityBadge severity={f.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-1">{f.title}</div>
                      {f.reference && (
                        <div className="text-xs text-text-3 mt-0.5">
                          Ref: {f.reference}
                        </div>
                      )}
                      {f.description && (
                        <p className="text-sm text-text-2 mt-1 whitespace-pre-wrap">
                          {f.description}
                        </p>
                      )}
                      {f.linked_deviation && (
                        <Link
                          href={`/avvik`}
                          className="text-xs text-orange hover:underline mt-1 inline-block"
                        >
                          Knyttet avvik: {f.linked_deviation.title}
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-text-3 text-sm">
              Ingen funn registrert.
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold">Nytt funn</h2>
        </div>
        <CardBody>
          <AddFindingForm auditPlanId={id} />
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-text-3">{label}</div>
      <div className="text-text-1 mt-0.5">{value}</div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { tone: "red" | "orange" | "yellow" | "neutral"; label: string }> = {
    critical: { tone: "red", label: "Kritisk" },
    major: { tone: "orange", label: "Major" },
    minor: { tone: "yellow", label: "Minor" },
    observation: { tone: "neutral", label: "Observasjon" },
  };
  const m = map[severity] ?? map.observation;
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
