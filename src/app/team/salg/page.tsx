import Link from "next/link";
import { staffAdminClient } from "@/lib/team/staff";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SalgClient } from "./salg-client";

const COMMISSION_PER_SALE_NOK = 500;
const SALES_INCLUDED_IN_SALARY = 10;
const TRIAL_DAYS = 14;

interface Assignment {
  organization_id: string;
  salesperson_id: string;
  assigned_at: string;
  notes: string | null;
}

interface OrgRow {
  id: string;
  firma: string;
  created_at: string | null;
  trial_ends_at: string | null;
  subscription_status: string | null;
  plan_tier: string | null;
  has_iso_addon: boolean;
}

interface Salesperson {
  id: string;
  full_name: string | null;
  email: string;
}

interface LedgerRow {
  id: string;
  organization_id: string;
  salesperson_id: string;
  payout_amount_nok: number;
  status: "pending_payout" | "salary_covered" | "paid" | "void";
  confirmed_at: string;
  paid_at: string | null;
}

export default async function SalgPage() {
  const admin = await staffAdminClient();

  const [
    { data: orgs },
    { data: assignments },
    { data: staff },
    { data: ledger },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select(
        "id, firma, created_at, trial_ends_at, subscription_status, plan_tier, has_iso_addon",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("sales_assignments")
      .select("organization_id, salesperson_id, assigned_at, notes"),
    admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("is_echoo_staff", true)
      .order("full_name"),
    admin
      .from("commission_ledger")
      .select(
        "id, organization_id, salesperson_id, payout_amount_nok, status, confirmed_at, paid_at",
      ),
  ]);

  const orgList = (orgs ?? []) as OrgRow[];
  const assignmentList = (assignments ?? []) as Assignment[];
  const staffList = (staff ?? []) as Salesperson[];
  const ledgerList = (ledger ?? []) as LedgerRow[];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Per-selger stats — drevet av faktisk ledger, ikke heuristikk
  interface Stat {
    pipeline: number; // tilegnet, men ikke betalt ennå
    confirmed_total: number; // ledger entries for all time
    confirmed_this_month: number; // ledger entries this month
    cancelled: number;
    pending_payout_nok: number; // sum unpaid commission
    paid_this_month_nok: number; // sum paid out this month
  }
  const statsBySalesperson = new Map<string, Stat>();
  for (const s of staffList) {
    statsBySalesperson.set(s.id, {
      pipeline: 0,
      confirmed_total: 0,
      confirmed_this_month: 0,
      cancelled: 0,
      pending_payout_nok: 0,
      paid_this_month_nok: 0,
    });
  }

  // Tell ledger-rader (= bekreftede salg med betaling)
  for (const row of ledgerList) {
    const stat = statsBySalesperson.get(row.salesperson_id);
    if (!stat) continue;
    if (row.status === "void") continue;
    stat.confirmed_total++;
    const confirmedAt = new Date(row.confirmed_at);
    if (confirmedAt >= monthStart) stat.confirmed_this_month++;
    if (row.status === "pending_payout") {
      stat.pending_payout_nok += Number(row.payout_amount_nok);
    }
    if (row.status === "paid" && row.paid_at) {
      const paidAt = new Date(row.paid_at);
      if (paidAt >= monthStart) {
        stat.paid_this_month_nok += Number(row.payout_amount_nok);
      }
    }
  }

  // Tell pipeline (tilegnet, men ikke betalt = ikke i ledger) og kansellert
  const assignmentMap = new Map(
    assignmentList.map((a) => [a.organization_id, a]),
  );
  const ledgerOrgIds = new Set(ledgerList.map((l) => l.organization_id));
  for (const a of assignmentList) {
    const org = orgList.find((o) => o.id === a.organization_id);
    if (!org) continue;
    const stat = statsBySalesperson.get(a.salesperson_id);
    if (!stat) continue;
    if (ledgerOrgIds.has(org.id)) continue; // allerede telt over
    if (org.subscription_status === "canceled") {
      stat.cancelled++;
    } else {
      stat.pipeline++;
    }
  }

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Salg og provisjon</h1>
          <p className="text-text-2 text-sm max-w-3xl">
            Provisjonen bokføres automatisk i ledgeren ved første betaling
            (Stripe webhook). De første {SALES_INCLUDED_IN_SALARY} salg per
            måned per selger er dekket av fastlønn; fra salg{" "}
            {SALES_INCLUDED_IN_SALARY + 1}+ utløser hver bokføring{" "}
            <strong>{COMMISSION_PER_SALE_NOK} kr</strong>.
          </p>
        </div>
        <Link
          href="/team/salg/utbetalinger"
          className="px-4 py-2 bg-orange text-bg rounded-md text-sm font-medium hover:opacity-90"
        >
          Utbetalinger →
        </Link>
      </header>

      {/* Per-selger oversikt */}
      {staffList.length === 0 ? (
        <Card>
          <CardBody className="text-center text-text-3 text-sm py-8">
            Ingen Echoo-staff registrert. Marker selgere som
            <code className="mx-1 bg-card-hover px-1 rounded">is_echoo_staff</code>
            i <a href="/team/staff" className="text-orange hover:underline">/team/staff</a>.
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {staffList.map((s) => {
            const stat = statsBySalesperson.get(s.id);
            if (!stat) return null;
            return (
              <Card key={s.id}>
                <div className="px-5 py-3 border-b border-border">
                  <div className="font-semibold text-text-1">
                    {s.full_name ?? s.email}
                  </div>
                  <div className="text-xs text-text-3">{s.email}</div>
                </div>
                <CardBody className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <Stat
                      label="Pipeline"
                      value={stat.pipeline}
                      sub="ikke betalt"
                    />
                    <Stat
                      label="Bekreftet i mnd"
                      value={stat.confirmed_this_month}
                      tone={
                        stat.confirmed_this_month >= SALES_INCLUDED_IN_SALARY
                          ? "green"
                          : undefined
                      }
                      sub={`av ${SALES_INCLUDED_IN_SALARY} i lønn`}
                    />
                    <Stat
                      label="Provisjon"
                      value={`${stat.pending_payout_nok.toLocaleString("nb-NO")} kr`}
                      tone={stat.pending_payout_nok > 0 ? "green" : undefined}
                      sub="ikke utbetalt"
                    />
                  </div>
                  {stat.paid_this_month_nok > 0 && (
                    <div className="text-xs text-text-3 text-center">
                      Allerede utbetalt i mnd:{" "}
                      <span className="text-text-1 font-medium">
                        {stat.paid_this_month_nok.toLocaleString("nb-NO")} kr
                      </span>
                    </div>
                  )}
                  {stat.confirmed_this_month < SALES_INCLUDED_IN_SALARY ? (
                    <div className="text-xs text-text-3 text-center">
                      {SALES_INCLUDED_IN_SALARY - stat.confirmed_this_month}{" "}
                      betalende salg til før provisjonen begynner å løpe.
                    </div>
                  ) : null}
                  {stat.cancelled > 0 && (
                    <div className="text-xs text-red text-center">
                      {stat.cancelled} kansellert før betaling (teller ikke)
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <SalgClient
        orgs={orgList}
        assignmentMap={assignmentMap}
        staff={staffList}
      />

      <div className="text-xs text-text-3 text-center space-y-1">
        <div>
          Periode:{" "}
          {now.toLocaleString("nb-NO", { month: "long", year: "numeric" })}.
        </div>
        <div>
          Trial: {TRIAL_DAYS} dager i Stripe — først ved første betaling
          opprettes en ledger-rad.
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "green" | "red";
}) {
  return (
    <div>
      <div className="text-xs text-text-3 uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div
        className={`text-lg font-semibold ${tone === "green" ? "text-green" : tone === "red" ? "text-red" : "text-text-1"}`}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-text-3 mt-0.5">{sub}</div>}
    </div>
  );
}

export { Badge };
