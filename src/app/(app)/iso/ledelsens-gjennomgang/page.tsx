import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";

export default async function MgmtReviewPage() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const { data: reviews } = await supabase
    .from("management_reviews")
    .select("*")
    .eq("organization_id", orgId)
    .order("scheduled_date", { ascending: false });

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ledelsens gjennomgang</h1>
          <p className="text-text-2 text-sm">
            Periodisk gjennomgang av kvalitets- og miljøsystemet (ISO 9001 9.3).
          </p>
        </div>
        <Link href="/iso/ledelsens-gjennomgang/ny">
          <Button>
            <Plus className="size-4 mr-1" />
            Ny gjennomgang
          </Button>
        </Link>
      </header>

      <Card>
        <CardBody className="!p-0">
          {reviews && reviews.length > 0 ? (
            <ul className="divide-y divide-border">
              {reviews.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/iso/ledelsens-gjennomgang/${r.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-card-hover"
                  >
                    <div className="size-8 rounded-md bg-orange/15 text-orange grid place-items-center shrink-0">
                      <Users className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-1 truncate">
                        {r.title}
                      </div>
                      <div className="text-xs text-text-3 truncate">
                        {r.scheduled_date}
                        {r.participants && ` · ${r.participants}`}
                      </div>
                    </div>
                    <Badge
                      tone={
                        r.status === "completed"
                          ? "green"
                          : r.status === "in_progress"
                            ? "orange"
                            : "yellow"
                      }
                    >
                      {{
                        scheduled: "Planlagt",
                        in_progress: "Pågår",
                        completed: "Ferdig",
                      }[r.status] ?? r.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-text-3 text-sm">
              Ingen gjennomganger ennå.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
