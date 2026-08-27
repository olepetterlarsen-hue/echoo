import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; tone: "neutral" | "orange" | "green" | "red" }> = {
  utkast: { label: "Utkast", tone: "neutral" },
  sendt: { label: "Sendt til signering", tone: "orange" },
  signert: { label: "Signert", tone: "green" },
  kansellert: { label: "Kansellert", tone: "red" },
};

export default async function AnsattePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: contracts } = await supabase
    .from("employment_contracts")
    .select("id, employee_name, stilling, status, start_date, provetid_slutt")
    .order("created_at", { ascending: false });

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ansatte</h1>
          <p className="text-text-2 text-sm">
            Arbeidsavtaler og onboarding av nye ansatte.
          </p>
        </div>
        <Link href="/admin/ansatte/ny">
          <Button>
            <UserPlus className="size-4" />
            Ny ansatt
          </Button>
        </Link>
      </header>

      {!contracts || contracts.length === 0 ? (
        <Card>
          <CardBody className="text-sm text-text-2">
            Ingen arbeidsavtaler ennå. Klikk «Ny ansatt» for å opprette den
            første.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => {
            const s = STATUS_LABEL[c.status] ?? STATUS_LABEL.utkast;
            return (
              <Card key={c.id}>
                <CardBody className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{c.employee_name}</div>
                    <div className="text-xs text-text-3">
                      {c.stilling ?? "—"}
                      {c.start_date && ` · tiltredelse ${c.start_date}`}
                      {c.provetid_slutt && ` · prøvetid til ${c.provetid_slutt}`}
                    </div>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
