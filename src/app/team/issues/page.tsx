import { staffAdminClient } from "@/lib/team/staff";
import { Card, CardBody } from "@/components/ui/card";
import { IssuesInboxClient } from "./issues-inbox-client";

interface PageProps {
  searchParams: Promise<{ focus?: string }>;
}

interface IssueRow {
  id: string;
  organization_id: string | null;
  reported_by: string | null;
  title: string;
  description: string | null;
  severity: "lav" | "middels" | "hoey";
  status: "apen" | "under_arbeid" | "lukket";
  page_url: string | null;
  user_agent: string | null;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export default async function TeamIssuesPage({ searchParams }: PageProps) {
  const { focus } = await searchParams;
  const admin = await staffAdminClient();

  const { data: issues } = await admin
    .from("issue_reports")
    .select(
      "id, organization_id, reported_by, title, description, severity, status, page_url, user_agent, admin_notes, created_at, resolved_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (issues ?? []) as IssueRow[];

  // Hent kunde- og rapportør-info i bulk
  const orgIds = Array.from(
    new Set(rows.map((r) => r.organization_id).filter((x): x is string => !!x)),
  );
  const userIds = Array.from(
    new Set(rows.map((r) => r.reported_by).filter((x): x is string => !!x)),
  );

  const [{ data: orgs }, { data: profiles }] = await Promise.all([
    orgIds.length
      ? admin
          .from("organizations")
          .select("id, firma, subscription_status, plan_tier")
          .in("id", orgIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? admin
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const orgMap = new Map(
    (orgs ?? []).map(
      (o: {
        id: string;
        firma: string;
        subscription_status: string | null;
        plan_tier: string | null;
      }) => [o.id, o],
    ),
  );
  const profileMap = new Map(
    (profiles ?? []).map(
      (p: { id: string; full_name: string | null; email: string }) => [p.id, p],
    ),
  );

  const enriched = rows.map((r) => ({
    ...r,
    org: r.organization_id ? orgMap.get(r.organization_id) ?? null : null,
    reporter: r.reported_by ? profileMap.get(r.reported_by) ?? null : null,
  }));

  // Topp-stats
  const openCount = rows.filter((r) => r.status === "apen").length;
  const inProgressCount = rows.filter((r) => r.status === "under_arbeid").length;
  const highOpen = rows.filter(
    (r) => r.status !== "lukket" && r.severity === "hoey",
  ).length;
  const last7d = rows.filter(
    (r) =>
      new Date(r.created_at).getTime() >
      Date.now() - 7 * 24 * 3600 * 1000,
  ).length;

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Rapporterte feil</h1>
        <p className="text-text-2 text-sm">
          Alle innmeldte feil fra Echoo-kunder. Filtrér, prioritér, og lukk når
          fikset.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Åpen" value={openCount} tone={openCount > 0 ? "orange" : undefined} />
        <Stat label="Under arbeid" value={inProgressCount} tone="yellow" />
        <Stat
          label="Høy prioritet (åpne)"
          value={highOpen}
          tone={highOpen > 0 ? "red" : undefined}
        />
        <Stat label="Innmeldt siste 7 dager" value={last7d} />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-text-3 text-sm py-8">
            Ingen feilrapporter ennå. Når en bruker trykker «Rapporter
            problem» i kunde-app-en dukker de opp her.
          </CardBody>
        </Card>
      ) : (
        <IssuesInboxClient rows={enriched} initialOrgFilter={focus} />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "orange" | "red" | "yellow";
}) {
  const toneCls =
    tone === "red"
      ? "text-red"
      : tone === "orange"
        ? "text-orange"
        : tone === "yellow"
          ? "text-yellow"
          : "text-text-1";
  return (
    <Card>
      <CardBody>
        <div className="text-xs text-text-3 uppercase tracking-wider">
          {label}
        </div>
        <div className={`text-2xl font-semibold mt-1 ${toneCls}`}>{value}</div>
      </CardBody>
    </Card>
  );
}
