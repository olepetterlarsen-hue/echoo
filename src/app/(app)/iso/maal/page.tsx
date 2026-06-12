import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Plus, Leaf } from "lucide-react";

export default async function MaalPage() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const { data: objectivesRaw } = await supabase
    .from("iso_objectives")
    .select("*, responsible:profiles!iso_objectives_responsible_id_fkey(full_name)")
    .eq("organization_id", orgId)
    .order("status")
    .order("deadline", { ascending: true, nullsFirst: false });
  const objectives = objectivesRaw as unknown as Array<{
    id: string;
    kind: string;
    title: string;
    target_value: string | null;
    deadline: string | null;
    status: string;
    responsible: { full_name: string | null } | null;
  }> | null;

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mål og KPI</h1>
          <p className="text-text-2 text-sm">
            Kvalitets- og miljømål (ISO 9001 6.2 / 14001 6.2).
          </p>
        </div>
        <Link href="/iso/maal/ny">
          <Button>
            <Plus className="size-4 mr-1" />
            Nytt mål
          </Button>
        </Link>
      </header>

      <Card>
        <CardBody className="!p-0">
          {objectives && objectives.length > 0 ? (
            <ul className="divide-y divide-border">
              {objectives.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/iso/maal/${o.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-card-hover"
                  >
                    <div className="size-8 rounded-md bg-orange/15 text-orange grid place-items-center shrink-0">
                      {o.kind === "environment" ? (
                        <Leaf className="size-4" />
                      ) : (
                        <Target className="size-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-1 truncate">
                        {o.title}
                      </div>
                      <div className="text-xs text-text-3 truncate">
                        {o.kind === "environment" ? "Miljømål" : "Kvalitetsmål"}
                        {o.target_value && ` · Mål: ${o.target_value}`}
                        {o.deadline && ` · Frist ${o.deadline}`}
                        {o.responsible?.full_name && ` · ${o.responsible.full_name}`}
                      </div>
                    </div>
                    <StatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-text-3 text-sm">
              Ingen mål registrert ennå.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map = {
    proposed: { tone: "neutral" as const, label: "Foreslått" },
    active: { tone: "orange" as const, label: "Aktiv" },
    met: { tone: "green" as const, label: "Nådd" },
    missed: { tone: "red" as const, label: "Ikke nådd" },
    cancelled: { tone: "neutral" as const, label: "Avbrutt" },
  };
  const m = map[status as keyof typeof map] ?? map.proposed;
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
