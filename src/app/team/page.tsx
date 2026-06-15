import Link from "next/link";
import { staffAdminClient } from "@/lib/team/staff";
import {
  STRIPE_PRICE_BASE,
  STRIPE_PRICE_ISO_ADDON,
} from "@/lib/stripe";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  Bug,
} from "lucide-react";

const BASE_PRICE_NOK = 2990;
const ISO_PRICE_NOK = 2000;

export default async function TeamDashboardPage() {
  const admin = await staffAdminClient();

  const { data: orgs } = await admin
    .from("organizations")
    .select(
      "id, firma, plan_tier, subscription_status, has_iso_addon, trial_ends_at, created_at, locked_at",
    )
    .order("created_at", { ascending: false });

  const all = orgs ?? [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Aktive abonnementer (betaler eller i trial)
  const active = all.filter(
    (o) =>
      o.subscription_status === "active" ||
      o.subscription_status === "trialing",
  );
  const paying = all.filter((o) => o.subscription_status === "active");
  const trial = all.filter((o) => o.subscription_status === "trialing");
  const churn = all.filter((o) => o.subscription_status === "canceled");
  const past_due = all.filter((o) => o.subscription_status === "past_due");

  // MRR = sum av basis + ISO-addon for betalende
  const mrr = paying.reduce((sum, o) => {
    return (
      sum + BASE_PRICE_NOK + (o.has_iso_addon ? ISO_PRICE_NOK : 0)
    );
  }, 0);
  const arr = mrr * 12;

  // Nye signups denne måneden + forrige
  const signupsThisMonth = all.filter(
    (o) => o.created_at && new Date(o.created_at) >= monthStart,
  ).length;
  const signupsLastMonth = all.filter(
    (o) =>
      o.created_at &&
      new Date(o.created_at) >= lastMonthStart &&
      new Date(o.created_at) < monthStart,
  ).length;

  // Churn rate (cancellations this month / active customers at start of month)
  const cancelledThisMonth = all.filter(
    (o) =>
      o.subscription_status === "canceled" &&
      o.locked_at &&
      new Date(o.locked_at) >= monthStart,
  ).length;
  const churnRate =
    active.length > 0
      ? ((cancelledThisMonth / (active.length + cancelledThisMonth)) * 100).toFixed(
          1,
        )
      : "0";

  // Trial-utløp neste 7 dager
  const sevenDays = new Date(now.getTime() + 7 * 86400000);
  const trialExpiringSoon = trial.filter(
    (o) =>
      o.trial_ends_at &&
      new Date(o.trial_ends_at) <= sevenDays &&
      new Date(o.trial_ends_at) > now,
  );

  // Siste 5 signups
  const recent = all.slice(0, 5);

  // Feilrapporter — siste åpne på tvers av kunder
  const { data: latestIssues } = await admin
    .from("issue_reports")
    .select(
      "id, title, severity, status, page_url, created_at, organization_id, reported_by",
    )
    .eq("status", "apen")
    .order("created_at", { ascending: false })
    .limit(8);
  const issuesList = (latestIssues ?? []) as Array<{
    id: string;
    title: string;
    severity: "lav" | "middels" | "hoey";
    status: string;
    page_url: string | null;
    created_at: string;
    organization_id: string | null;
    reported_by: string | null;
  }>;
  const issueOrgIds = Array.from(
    new Set(
      issuesList
        .map((i) => i.organization_id)
        .filter((x): x is string => !!x),
    ),
  );
  const issueReporterIds = Array.from(
    new Set(
      issuesList.map((i) => i.reported_by).filter((x): x is string => !!x),
    ),
  );
  const [{ data: issueOrgs }, { data: issueReporters }] = await Promise.all([
    issueOrgIds.length
      ? admin.from("organizations").select("id, firma").in("id", issueOrgIds)
      : Promise.resolve({ data: [] }),
    issueReporterIds.length
      ? admin
          .from("profiles")
          .select("id, full_name, email")
          .in("id", issueReporterIds)
      : Promise.resolve({ data: [] }),
  ]);
  const issueOrgMap = new Map(
    (issueOrgs ?? []).map((o: { id: string; firma: string }) => [o.id, o.firma]),
  );
  const issueReporterMap = new Map(
    (issueReporters ?? []).map(
      (p: { id: string; full_name: string | null; email: string }) => [
        p.id,
        p.full_name ?? p.email,
      ],
    ),
  );
  const { count: totalOpenIssues } = await admin
    .from("issue_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "apen");
  const totalOpen = totalOpenIssues ?? 0;

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Team-dashboard</h1>
        <p className="text-text-2 text-sm">
          Sanntidsoversikt over Echoos kunder, abonnementer og økonomi.
        </p>
      </header>

      {/* KPI-cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="MRR"
          value={`${mrr.toLocaleString("nb-NO")} kr`}
          sub={`ARR ${arr.toLocaleString("nb-NO")} kr`}
          icon={<TrendingUp className="size-4 text-green" />}
        />
        <KpiCard
          label="Aktive kunder"
          value={String(active.length)}
          sub={`${paying.length} betalende · ${trial.length} trial`}
          icon={<Users className="size-4 text-orange" />}
        />
        <KpiCard
          label="Nye denne måneden"
          value={String(signupsThisMonth)}
          sub={`Forrige: ${signupsLastMonth}`}
          trend={signupsThisMonth - signupsLastMonth}
          icon={<Sparkles className="size-4 text-orange" />}
        />
        <KpiCard
          label="Churn (mnd)"
          value={`${churnRate} %`}
          sub={`${cancelledThisMonth} kansellert i ${now.toLocaleString("nb-NO", { month: "long" })}`}
          icon={<AlertTriangle className="size-4 text-red" />}
        />
      </div>

      {/* Siste feilrapporter — flyttet opp så den er synlig uten å scrolle */}
      <Card>
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Bug className="size-4 text-orange" />
            Siste feilrapporter
            {totalOpen > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-orange/15 text-orange font-medium">
                {totalOpen} åpne
              </span>
            )}
          </h2>
          <Link
            href="/team/issues"
            className="text-xs text-orange hover:underline flex items-center gap-1"
          >
            Alle rapporter <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <CardBody className="!p-0">
          {issuesList.length === 0 ? (
            <div className="p-6 text-center text-text-3 text-sm">
              Ingen åpne feilrapporter. ✓
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {issuesList.map((i) => {
                let displayPath: string | null = null;
                if (i.page_url) {
                  try {
                    displayPath = new URL(i.page_url).pathname;
                  } catch {
                    displayPath = i.page_url;
                  }
                }
                return (
                  <li key={i.id}>
                    <Link
                      href={`/team/issues?focus=${i.organization_id ?? ""}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-card-hover"
                    >
                      <span
                        className={`size-2 rounded-full shrink-0 ${
                          i.severity === "hoey"
                            ? "bg-red"
                            : i.severity === "middels"
                              ? "bg-yellow"
                              : "bg-text-3"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-text-1 truncate">
                          {i.title}
                        </div>
                        <div className="text-xs text-text-3 truncate">
                          <span className="text-orange">
                            {i.organization_id
                              ? issueOrgMap.get(i.organization_id) ?? "?"
                              : "—"}
                          </span>
                          {" · "}
                          {i.reported_by
                            ? issueReporterMap.get(i.reported_by) ?? "anonym"
                            : "anonym"}
                          {displayPath && (
                            <>
                              {" · "}
                              <code className="text-[11px]">{displayPath}</code>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-text-3 shrink-0">
                        {new Date(i.created_at).toLocaleDateString("nb-NO", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent signups */}
        <Card>
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold">Siste signups</h2>
            <Link
              href="/team/kunder"
              className="text-xs text-orange hover:underline flex items-center gap-1"
            >
              Alle kunder <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <CardBody className="!p-0">
            {recent.length === 0 ? (
              <div className="p-6 text-center text-text-3 text-sm">
                Ingen kunder ennå.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/team/kunder?focus=${o.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-card-hover"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text-1 truncate">
                          {o.firma}
                        </div>
                        <div className="text-xs text-text-3">
                          {o.created_at &&
                            new Date(o.created_at).toLocaleDateString("nb-NO")}
                        </div>
                      </div>
                      <StatusBadge status={o.subscription_status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Trial expiring soon */}
        <Card>
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-base font-semibold">
              Trial utløper neste 7 dager ({trialExpiringSoon.length})
            </h2>
          </div>
          <CardBody className="!p-0">
            {trialExpiringSoon.length === 0 ? (
              <div className="p-6 text-center text-text-3 text-sm">
                Ingen trial utløper snart.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {trialExpiringSoon.map((o) => {
                  const days = o.trial_ends_at
                    ? Math.ceil(
                        (new Date(o.trial_ends_at).getTime() - now.getTime()) /
                          86400000,
                      )
                    : null;
                  return (
                    <li key={o.id}>
                      <Link
                        href={`/team/kunder?focus=${o.id}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-card-hover"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-text-1 truncate">
                            {o.firma}
                          </div>
                          <div className="text-xs text-text-3">
                            Utløper{" "}
                            {o.trial_ends_at &&
                              new Date(o.trial_ends_at).toLocaleDateString(
                                "nb-NO",
                              )}
                          </div>
                        </div>
                        <Badge tone={days && days <= 3 ? "red" : "orange"}>
                          {days} dager
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>


      {past_due.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-base font-semibold text-yellow">
              Forfalte betalinger ({past_due.length})
            </h2>
          </div>
          <CardBody className="!p-0">
            <ul className="divide-y divide-border">
              {past_due.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <span className="text-sm font-medium text-text-1">
                    {o.firma}
                  </span>
                  <Badge tone="yellow">past_due</Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <div className="text-xs text-text-3 text-center">
        Churn = kansellerte denne måneden ÷ (aktive + kansellerte). Tallet på
        {churn.length} totalt kansellert siden start.
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  trend,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-3 uppercase tracking-wider">
            {label}
          </span>
          {icon}
        </div>
        <div className="text-2xl font-semibold">{value}</div>
        {sub && (
          <div className="text-xs text-text-3">
            {sub}
            {trend !== undefined && trend !== 0 && (
              <span
                className={`ml-1 ${trend > 0 ? "text-green" : "text-red"}`}
              >
                ({trend > 0 ? "+" : ""}
                {trend})
              </span>
            )}
          </div>
        )}
      </CardBody>
    </Card>
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
  void STRIPE_PRICE_BASE;
  void STRIPE_PRICE_ISO_ADDON;
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
