import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/org";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Leaf, Plus } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  waste: "Avfall",
  energy: "Energi",
  water: "Vann",
  emissions_air: "Luftutslipp",
  chemicals: "Kjemikalier",
  noise: "Støy",
  soil: "Jord",
  biodiversity: "Biologisk mangfold",
  resources: "Ressurser",
  other: "Annet",
};

export default async function AspekterPage() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId(supabase);

  const { data: aspects } = await supabase
    .from("env_aspects")
    .select("*")
    .eq("organization_id", orgId)
    .order("significance_score", { ascending: false });

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Miljøaspekter</h1>
          <p className="text-text-2 text-sm">
            Identifisering og scoring av miljøaspekter (ISO 14001 6.1.2).
          </p>
        </div>
        <Link href="/iso/miljoaspekter/ny">
          <Button>
            <Plus className="size-4 mr-1" />
            Nytt aspekt
          </Button>
        </Link>
      </header>

      <Card>
        <CardBody className="!p-0">
          {aspects && aspects.length > 0 ? (
            <ul className="divide-y divide-border">
              {aspects.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-card-hover"
                >
                  <div className="size-8 rounded-md bg-orange/15 text-orange grid place-items-center shrink-0">
                    <Leaf className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-1 truncate">
                      {a.title}
                    </div>
                    <div className="text-xs text-text-3 truncate">
                      {CATEGORY_LABEL[a.category] ?? a.category}
                      {" · "}livssyklus: {a.lifecycle}
                      {a.frequency_score && a.severity_score &&
                        ` · score ${a.significance_score}`}
                    </div>
                  </div>
                  {a.is_significant && <Badge tone="orange">Signifikant</Badge>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-text-3 text-sm">
              Ingen aspekter registrert.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
