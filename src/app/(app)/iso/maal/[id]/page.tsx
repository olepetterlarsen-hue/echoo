import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MeasurementForm } from "./measurement-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ObjectiveDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const { data: objRaw } = await supabase
    .from("iso_objectives")
    .select(
      "*, responsible:profiles!iso_objectives_responsible_id_fkey(full_name)",
    )
    .eq("organization_id", orgId)
    .eq("id", id)
    .single();
  if (!objRaw) notFound();
  const obj = objRaw as unknown as {
    id: string;
    kind: "quality" | "environment";
    title: string;
    description: string | null;
    status: string;
    target_value: string | null;
    unit: string | null;
    baseline_value: number | null;
    current_value: number | null;
    target_numeric: number | null;
    deadline: string | null;
    measurement_method: string | null;
    responsible: { full_name: string | null } | null;
  };

  const { data: measurements } = await supabase
    .from("iso_objective_measurements")
    .select("*")
    .eq("objective_id", id)
    .order("measured_at", { ascending: false })
    .limit(20);

  const progress =
    obj.target_numeric != null && obj.current_value != null
      ? Math.round((obj.current_value / obj.target_numeric) * 100)
      : null;

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <div className="text-xs uppercase text-text-3 tracking-wider">
          {obj.kind === "environment" ? "Miljømål" : "Kvalitetsmål"}
        </div>
        <h1 className="text-2xl font-semibold">{obj.title}</h1>
        {obj.description && (
          <p className="text-text-2 text-sm mt-1">{obj.description}</p>
        )}
      </header>

      <Card>
        <CardBody className="grid grid-cols-2 gap-4 text-sm">
          <Stat label="Status" value={obj.status} />
          <Stat label="Frist" value={obj.deadline ?? "—"} />
          <Stat label="Målverdi" value={obj.target_value ?? "—"} />
          <Stat label="Enhet" value={obj.unit ?? "—"} />
          <Stat
            label="Baseline"
            value={obj.baseline_value?.toString() ?? "—"}
          />
          <Stat
            label="Nåværende"
            value={obj.current_value?.toString() ?? "—"}
          />
          <Stat
            label="Ansvarlig"
            value={obj.responsible?.full_name ?? "—"}
          />
          <Stat
            label="Progresjon"
            value={progress != null ? `${progress}%` : "—"}
          />
        </CardBody>
      </Card>

      {obj.measurement_method && (
        <Card>
          <CardBody>
            <h2 className="text-base font-semibold mb-2">Målemetode</h2>
            <p className="text-sm text-text-2 whitespace-pre-wrap">
              {obj.measurement_method}
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h2 className="text-base font-semibold mb-3">Ny måling</h2>
          <MeasurementForm objectiveId={id} unit={obj.unit} />
        </CardBody>
      </Card>

      <Card>
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold">Måle-historikk</h2>
        </div>
        <CardBody className="!p-0">
          {measurements && measurements.length > 0 ? (
            <ul className="divide-y divide-border">
              {measurements.map((m) => (
                <li
                  key={m.id}
                  className="px-5 py-3 flex items-center justify-between text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {m.value}
                      {obj.unit ? ` ${obj.unit}` : ""}
                    </div>
                    {m.notes && (
                      <div className="text-xs text-text-3 mt-0.5">
                        {m.notes}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-text-3">
                    {new Date(m.measured_at).toLocaleDateString("nb-NO")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-text-3 text-sm">
              Ingen målinger registrert ennå.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-text-3">
        {label}
      </div>
      <div className="text-text-1 mt-0.5">{value}</div>
    </div>
  );
}
