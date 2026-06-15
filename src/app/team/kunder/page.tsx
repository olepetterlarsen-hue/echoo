import { staffAdminClient } from "@/lib/team/staff";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  searchParams: Promise<{ focus?: string; status?: string }>;
}

export default async function TeamKunderPage({ searchParams }: PageProps) {
  const { focus, status } = await searchParams;
  const admin = await staffAdminClient();

  let query = admin
    .from("organizations")
    .select(
      "id, firma, org_nr, plan_tier, subscription_status, has_iso_addon, trial_ends_at, created_at, locked_at, stripe_customer_id, selskap_epost, selskap_telefon",
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("subscription_status", status);

  const { data: orgs } = await query;
  const list = orgs ?? [];

  // Hent assignments + selger-info for hver org
  const orgIds = list.map((o) => o.id);
  const { data: assignments } = orgIds.length
    ? await admin
        .from("sales_assignments")
        .select("organization_id, salesperson_id")
        .in("organization_id", orgIds)
    : { data: [] };
  const { data: salespeople } =
    assignments && assignments.length > 0
      ? await admin
          .from("profiles")
          .select("id, full_name, email")
          .in(
            "id",
            assignments.map((a) => a.salesperson_id),
          )
      : { data: [] };

  const assignmentMap = new Map(
    (assignments ?? []).map((a) => [a.organization_id, a.salesperson_id]),
  );
  const salespeopleMap = new Map(
    (salespeople ?? []).map((p) => [p.id, p.full_name ?? p.email]),
  );

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Kunder ({list.length})</h1>
        <p className="text-text-2 text-sm">
          Alle organisasjoner på tvers av tenants. Klikk for å se detaljer.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <FilterPill href="/team/kunder" active={!status}>
          Alle
        </FilterPill>
        <FilterPill
          href="/team/kunder?status=active"
          active={status === "active"}
        >
          Aktive
        </FilterPill>
        <FilterPill
          href="/team/kunder?status=trialing"
          active={status === "trialing"}
        >
          Trial
        </FilterPill>
        <FilterPill
          href="/team/kunder?status=past_due"
          active={status === "past_due"}
        >
          Forfalt
        </FilterPill>
        <FilterPill
          href="/team/kunder?status=canceled"
          active={status === "canceled"}
        >
          Kansellert
        </FilterPill>
      </div>

      <Card>
        <CardBody className="!p-0 overflow-x-auto">
          {list.length === 0 ? (
            <div className="p-8 text-center text-text-3 text-sm">
              Ingen kunder funnet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-card-hover text-text-3 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5">Bedrift</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">Plan</th>
                  <th className="text-left px-4 py-2.5">Selger</th>
                  <th className="text-left px-4 py-2.5">Trial-utløp</th>
                  <th className="text-left px-4 py-2.5">Signup</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((o) => {
                  const isFocused = focus === o.id;
                  const salespersonId = assignmentMap.get(o.id);
                  return (
                    <tr
                      key={o.id}
                      className={`${isFocused ? "bg-orange/10" : "hover:bg-card-hover"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-text-1">
                          {o.firma}
                        </div>
                        <div className="text-xs text-text-3 mt-0.5">
                          {o.org_nr && `${o.org_nr} · `}
                          {o.selskap_epost ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.subscription_status} />
                      </td>
                      <td className="px-4 py-3 text-text-2 text-xs">
                        {o.plan_tier === "elektro_hms"
                          ? o.has_iso_addon
                            ? "Elektro+HMS + ISO"
                            : "Elektro+HMS"
                          : "Trial"}
                      </td>
                      <td className="px-4 py-3 text-text-2 text-xs">
                        {salespersonId
                          ? salespeopleMap.get(salespersonId) ?? "—"
                          : (
                              <span className="text-text-3 italic">
                                Ikke tilegnet
                              </span>
                            )}
                      </td>
                      <td className="px-4 py-3 text-text-2 text-xs">
                        {o.trial_ends_at
                          ? new Date(o.trial_ends_at).toLocaleDateString(
                              "nb-NO",
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-text-2 text-xs">
                        {o.created_at &&
                          new Date(o.created_at).toLocaleDateString("nb-NO")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

import Link from "next/link";

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm border ${
        active
          ? "bg-orange text-bg border-orange"
          : "bg-card text-text-2 border-border hover:bg-card-hover"
      }`}
    >
      {children}
    </Link>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge tone="neutral">—</Badge>;
  const map: Record<
    string,
    { label: string; tone: "green" | "yellow" | "orange" | "red" | "neutral" }
  > = {
    active: { label: "Aktiv", tone: "green" },
    trialing: { label: "Trial", tone: "orange" },
    past_due: { label: "Forfalt", tone: "yellow" },
    canceled: { label: "Kansellert", tone: "red" },
    incomplete: { label: "Ufullstendig", tone: "yellow" },
    unpaid: { label: "Ubetalt", tone: "red" },
  };
  const m = map[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
