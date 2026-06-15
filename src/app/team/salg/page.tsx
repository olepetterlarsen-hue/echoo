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

export default async function SalgPage() {
  const admin = await staffAdminClient();

  const [
    { data: orgs },
    { data: assignments },
    { data: staff },
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
  ]);

  const orgList = (orgs ?? []) as OrgRow[];
  const assignmentList = (assignments ?? []) as Assignment[];
  const staffList = (staff ?? []) as Salesperson[];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Beregn per-selger stats
  const statsBySalesperson = new Map<
    string,
    {
      pipeline: number;
      confirmed_total: number;
      confirmed_this_month: number;
      cancelled: number;
      orgs: Array<{
        org: OrgRow;
        bucket: "pipeline" | "confirmed" | "cancelled";
        confirmedAt: Date | null;
      }>;
    }
  >();

  for (const s of staffList) {
    statsBySalesperson.set(s.id, {
      pipeline: 0,
      confirmed_total: 0,
      confirmed_this_month: 0,
      cancelled: 0,
      orgs: [],
    });
  }

  const assignmentMap = new Map(
    assignmentList.map((a) => [a.organization_id, a]),
  );

  for (const a of assignmentList) {
    const org = orgList.find((o) => o.id === a.organization_id);
    if (!org) continue;
    const stat = statsBySalesperson.get(a.salesperson_id);
    if (!stat) continue;

    let bucket: "pipeline" | "confirmed" | "cancelled" = "pipeline";
    let confirmedAt: Date | null = null;

    if (org.subscription_status === "canceled") {
      bucket = "cancelled";
      stat.cancelled++;
    } else if (
      org.subscription_status === "active" ||
      org.subscription_status === "trialing"
    ) {
      const signup = org.created_at ? new Date(org.created_at) : null;
      if (
        signup &&
        signup.getTime() + TRIAL_DAYS * 86400000 < now.getTime()
      ) {
        bucket = "confirmed";
        confirmedAt = new Date(signup.getTime() + TRIAL_DAYS * 86400000);
        stat.confirmed_total++;
        if (confirmedAt >= monthStart) stat.confirmed_this_month++;
      } else {
        bucket = "pipeline";
        stat.pipeline++;
      }
    } else {
      bucket = "pipeline";
      stat.pipeline++;
    }

    stat.orgs.push({ org, bucket, confirmedAt });
  }

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Salg og provisjon</h1>
        <p className="text-text-2 text-sm">
          Bedriften som ikke kansellerer innen {TRIAL_DAYS} dager teller som
          bekreftet salg. Fra salg {SALES_INCLUDED_IN_SALARY + 1}+ per måned er
          provisjonen <strong>{COMMISSION_PER_SALE_NOK} kr</strong> per salg
          (de første {SALES_INCLUDED_IN_SALARY} er inkludert i fastlønn).
        </p>
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
            const commissionableThisMonth = Math.max(
              0,
              stat.confirmed_this_month - SALES_INCLUDED_IN_SALARY,
            );
            const commission =
              commissionableThisMonth * COMMISSION_PER_SALE_NOK;
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
                      sub="< 14 dager"
                    />
                    <Stat
                      label="Bekreftet i mnd"
                      value={stat.confirmed_this_month}
                      tone={
                        stat.confirmed_this_month >= SALES_INCLUDED_IN_SALARY
                          ? "green"
                          : undefined
                      }
                    />
                    <Stat
                      label="Provisjon"
                      value={`${commission.toLocaleString("nb-NO")} kr`}
                      tone={commission > 0 ? "green" : undefined}
                    />
                  </div>
                  <div className="text-xs text-text-3 text-center">
                    {stat.confirmed_this_month < SALES_INCLUDED_IN_SALARY ? (
                      <>
                        {SALES_INCLUDED_IN_SALARY - stat.confirmed_this_month} salg
                        igjen til provisjonen begynner å løpe.
                      </>
                    ) : (
                      <>
                        {commissionableThisMonth} salg over basen ×{" "}
                        {COMMISSION_PER_SALE_NOK} kr
                      </>
                    )}
                  </div>
                  {stat.cancelled > 0 && (
                    <div className="text-xs text-red text-center">
                      {stat.cancelled} kansellert (teller ikke)
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tildeling-grensesnitt */}
      <SalgClient
        orgs={orgList}
        assignmentMap={assignmentMap}
        staff={staffList}
      />

      <div className="text-xs text-text-3 text-center">
        Periode: {now.toLocaleString("nb-NO", { month: "long", year: "numeric" })}.
        Provisjon-utbetaling skjer typisk på etterskudd basert på denne tellingen.
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

// re-export Badge for child usage
export { Badge };
