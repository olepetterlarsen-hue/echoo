import { staffAdminClient } from "@/lib/team/staff";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StaffClient } from "./staff-client";

export default async function TeamStaffPage() {
  const admin = await staffAdminClient();

  const { data: staff } = await admin
    .from("profiles")
    .select("id, email, full_name, is_echoo_staff, organization_id, active")
    .eq("is_echoo_staff", true)
    .order("full_name");

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Internt team</h1>
        <p className="text-text-2 text-sm">
          Echoo-ansatte med tilgang til /team. Søk på e-post for å legge til
          eller fjerne.
        </p>
      </header>

      <StaffClient />

      <Card>
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-semibold">Aktive ({staff?.length ?? 0})</h3>
        </div>
        <CardBody className="!p-0">
          {staff && staff.length > 0 ? (
            <ul className="divide-y divide-border">
              {staff.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <div className="font-medium text-text-1 text-sm">
                      {s.full_name ?? s.email}
                    </div>
                    <div className="text-xs text-text-3">{s.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.organization_id ? (
                      <Badge tone="neutral">Hybrid (også kunde)</Badge>
                    ) : (
                      <Badge tone="orange">Kun staff</Badge>
                    )}
                    {!s.active && <Badge tone="red">Deaktivert</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-text-3 text-sm">
              Ingen staff ennå.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
