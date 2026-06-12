import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Plus } from "lucide-react";

export default async function RevisjonerPage() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const { data: plansRaw } = await supabase
    .from("audit_plans")
    .select(
      "*, auditor:profiles!audit_plans_auditor_id_fkey(full_name), findings_count:audit_findings(count)",
    )
    .eq("organization_id", orgId)
    .order("planned_date", { ascending: false });
  const plans = plansRaw as unknown as Array<{
    id: string;
    title: string;
    planned_date: string;
    status: string;
    external_auditor_name: string | null;
    auditor: { full_name: string | null } | null;
    findings_count: Array<{ count: number }> | null;
  }> | null;

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Internrevisjoner</h1>
          <p className="text-text-2 text-sm">
            Planlegg revisjoner, fyll inn sjekklister, registrer funn (ISO 9001 9.2).
          </p>
        </div>
        <Link href="/iso/revisjoner/ny">
          <Button>
            <Plus className="size-4 mr-1" />
            Ny revisjon
          </Button>
        </Link>
      </header>

      <Card>
        <CardBody className="!p-0">
          {plans && plans.length > 0 ? (
            <ul className="divide-y divide-border">
              {plans.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/iso/revisjoner/${p.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-card-hover"
                  >
                    <div className="size-8 rounded-md bg-orange/15 text-orange grid place-items-center shrink-0">
                      <ClipboardCheck className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-1 truncate">
                        {p.title}
                      </div>
                      <div className="text-xs text-text-3 truncate">
                        {p.planned_date}
                        {p.auditor?.full_name && ` · ${p.auditor.full_name}`}
                        {p.external_auditor_name &&
                          ` · ${p.external_auditor_name}`}
                        {Array.isArray(p.findings_count) &&
                          p.findings_count[0]?.count !== undefined &&
                          ` · ${p.findings_count[0].count} funn`}
                      </div>
                    </div>
                    <Badge
                      tone={
                        p.status === "completed"
                          ? "green"
                          : p.status === "in_progress"
                            ? "orange"
                            : p.status === "cancelled"
                              ? "neutral"
                              : "yellow"
                      }
                    >
                      {statusLabel(p.status)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-text-3 text-sm">
              Ingen revisjoner planlagt ennå.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function statusLabel(s: string) {
  return (
    {
      planned: "Planlagt",
      in_progress: "Pågår",
      completed: "Ferdig",
      cancelled: "Avbrutt",
    }[s] ?? s
  );
}
