import { staffAdminClient } from "@/lib/team/staff";
import { Card, CardBody } from "@/components/ui/card";
import { KunderClient } from "./kunder-client";

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
  const orgIds = list.map((o) => o.id);

  // Hent assignments + selgere
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

  // Hent ALLE medlemmer i alle disse organisasjonene
  const { data: members } = orgIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name, email, role, organization_id, created_at, active")
        .in("organization_id", orgIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Tell åpne feilrapporter per kunde
  const { data: openIssues } = orgIds.length
    ? await admin
        .from("issue_reports")
        .select("organization_id")
        .in("organization_id", orgIds)
        .eq("status", "apen")
    : { data: [] };

  const assignmentMap = new Map(
    (assignments ?? []).map((a) => [a.organization_id, a.salesperson_id]),
  );
  const salespeopleMap = new Map(
    (salespeople ?? []).map((p) => [p.id, p.full_name ?? p.email]),
  );
  const membersByOrg = new Map<
    string,
    Array<{
      id: string;
      full_name: string | null;
      email: string;
      role: string | null;
      created_at: string;
      active: boolean | null;
    }>
  >();
  for (const m of members ?? []) {
    if (!m.organization_id) continue;
    const arr = membersByOrg.get(m.organization_id) ?? [];
    arr.push({
      id: m.id,
      full_name: m.full_name,
      email: m.email,
      role: m.role,
      created_at: m.created_at,
      active: m.active,
    });
    membersByOrg.set(m.organization_id, arr);
  }
  const openIssuesByOrg = new Map<string, number>();
  for (const i of openIssues ?? []) {
    if (!i.organization_id) continue;
    openIssuesByOrg.set(
      i.organization_id,
      (openIssuesByOrg.get(i.organization_id) ?? 0) + 1,
    );
  }

  // Bygg radene som passer client-komponenten
  const rows = list.map((o) => ({
    id: o.id,
    firma: o.firma,
    org_nr: o.org_nr,
    plan_tier: o.plan_tier,
    subscription_status: o.subscription_status,
    has_iso_addon: o.has_iso_addon,
    trial_ends_at: o.trial_ends_at,
    created_at: o.created_at,
    selskap_epost: o.selskap_epost,
    selskap_telefon: o.selskap_telefon,
    locked_at: o.locked_at,
    salesperson:
      assignmentMap.get(o.id) && salespeopleMap.get(assignmentMap.get(o.id)!)
        ? (salespeopleMap.get(assignmentMap.get(o.id)!) as string)
        : null,
    members: membersByOrg.get(o.id) ?? [],
    open_issues: openIssuesByOrg.get(o.id) ?? 0,
  }));

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Kunder ({list.length})</h1>
        <p className="text-text-2 text-sm">
          Klikk en bedrift for å se medlemmer og åpne feilrapporter.
        </p>
      </header>

      {list.length === 0 ? (
        <Card>
          <CardBody className="text-center text-text-3 py-8 text-sm">
            Ingen kunder funnet.
          </CardBody>
        </Card>
      ) : (
        <KunderClient rows={rows} initialFocus={focus} initialStatus={status} />
      )}
    </div>
  );
}
