import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scale, Plus } from "lucide-react";

export default async function EtterlevelsePage() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const { data: itemsRaw } = await supabase
    .from("compliance_obligations")
    .select(
      "*, responsible:profiles!compliance_obligations_responsible_id_fkey(full_name)",
    )
    .eq("organization_id", orgId)
    .order("status")
    .order("next_review_date", { ascending: true, nullsFirst: false });
  const items = itemsRaw as unknown as Array<{
    id: string;
    regulation: string;
    requirement: string;
    status: string;
    next_review_date: string | null;
    responsible: { full_name: string | null } | null;
  }> | null;

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Etterlevelse</h1>
          <p className="text-text-2 text-sm">
            Lov- og forskriftskrav med evidens (ISO 14001 6.1.3).
          </p>
        </div>
        <Link href="/iso/etterlevelse/ny">
          <Button>
            <Plus className="size-4 mr-1" />
            Ny forpliktelse
          </Button>
        </Link>
      </header>

      <Card>
        <CardBody className="!p-0">
          {items && items.length > 0 ? (
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-card-hover"
                >
                  <div className="size-8 rounded-md bg-orange/15 text-orange grid place-items-center shrink-0">
                    <Scale className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-1 truncate">
                      {it.regulation}
                    </div>
                    <div className="text-xs text-text-3 truncate">
                      {it.requirement}
                      {it.next_review_date && ` · Neste gjennomgang ${it.next_review_date}`}
                      {it.responsible?.full_name && ` · ${it.responsible.full_name}`}
                    </div>
                  </div>
                  <StatusBadge status={it.status} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-text-3 text-sm">
              Ingen forpliktelser registrert.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "green" | "red" | "yellow" | "neutral"; label: string }> = {
    compliant: { tone: "green", label: "Etterlevd" },
    non_compliant: { tone: "red", label: "Ikke etterlevd" },
    under_review: { tone: "yellow", label: "Under vurdering" },
    not_applicable: { tone: "neutral", label: "Ikke relevant" },
  };
  const m = map[status] ?? map.under_review;
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
