import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Card, CardBody } from "@/components/ui/card";
import { DecisionsForm } from "./decisions-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MgmtReviewDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const { data: review } = await supabase
    .from("management_reviews")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .single();
  if (!review) notFound();

  const snapshot = (review.inputs_snapshot ?? {}) as Record<string, unknown>;

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <Link
          href="/iso/ledelsens-gjennomgang"
          className="text-xs text-text-3 hover:text-orange"
        >
          ← Tilbake
        </Link>
        <h1 className="text-2xl font-semibold mt-1">{review.title}</h1>
        <p className="text-text-2 text-sm">
          Planlagt: {review.scheduled_date}
        </p>
      </header>

      <Card>
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold">
            Inputs-snapshot ved opprettelse
          </h2>
        </div>
        <CardBody className="grid grid-cols-2 gap-3 text-sm">
          <Stat
            label="Åpne avvik"
            value={String(snapshot.open_deviations ?? "—")}
          />
          <Stat
            label="Forfalte avvik"
            value={String(snapshot.overdue_deviations ?? "—")}
          />
          <Stat
            label="Uløste revisjonsfunn"
            value={String(snapshot.unresolved_audit_findings ?? "—")}
          />
          <Stat
            label="Sertifikater utløper 90d"
            value={String(snapshot.expiring_certificates_90d ?? "—")}
          />
          <Stat
            label="Åpne mål"
            value={String(snapshot.open_objectives ?? "—")}
          />
          <Stat
            label="Snapshot-tidspunkt"
            value={
              snapshot.snapshot_at
                ? new Date(snapshot.snapshot_at as string).toLocaleString("nb-NO")
                : "—"
            }
          />
        </CardBody>
      </Card>

      {Array.isArray(review.agenda) && review.agenda.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-base font-semibold">Agenda</h2>
          </div>
          <CardBody className="!p-0">
            <ol className="divide-y divide-border">
              {review.agenda.map((item, i: number) => (
                <li key={i} className="px-5 py-3 text-sm">
                  <span className="text-text-3 mr-2">{i + 1}.</span>
                  {item.title}
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}

      <Card>
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold">Beslutninger og notater</h2>
        </div>
        <CardBody>
          <DecisionsForm
            id={id}
            initialDecisions={review.decisions ?? ""}
            initialStatus={review.status}
            initialNextDate={review.next_review_date ?? ""}
          />
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-text-3">{label}</div>
      <div className="text-text-1 mt-0.5 font-medium">{value}</div>
    </div>
  );
}
