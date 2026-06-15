import Link from "next/link";
import { staffAdminClient } from "@/lib/team/staff";
import { Card, CardBody } from "@/components/ui/card";
import { UtbetalingerClient } from "./utbetalinger-client";

interface LedgerRow {
  id: string;
  organization_id: string;
  salesperson_id: string;
  payout_amount_nok: number;
  status: "pending_payout" | "salary_covered" | "paid" | "void";
  confirmed_at: string;
  paid_at: string | null;
  payout_ref: string | null;
  notes: string | null;
  stripe_invoice_id: string | null;
}

export default async function UtbetalingerPage() {
  const admin = await staffAdminClient();

  const { data: ledger } = await admin
    .from("commission_ledger")
    .select(
      "id, organization_id, salesperson_id, payout_amount_nok, status, confirmed_at, paid_at, payout_ref, notes, stripe_invoice_id",
    )
    .order("confirmed_at", { ascending: false });

  const rows = (ledger ?? []) as LedgerRow[];

  // Hent kundenavn + selgernavn i samme spørring (krever ingen FK-join siden vi henter alle separat)
  const orgIds = Array.from(new Set(rows.map((r) => r.organization_id)));
  const salesIds = Array.from(new Set(rows.map((r) => r.salesperson_id)));

  const [{ data: orgs }, { data: staff }] = await Promise.all([
    orgIds.length
      ? admin.from("organizations").select("id, firma").in("id", orgIds)
      : Promise.resolve({ data: [] }),
    salesIds.length
      ? admin
          .from("profiles")
          .select("id, full_name, email")
          .in("id", salesIds)
      : Promise.resolve({ data: [] }),
  ]);

  const orgMap = new Map(
    (orgs ?? []).map((o: { id: string; firma: string }) => [o.id, o.firma]),
  );
  const staffMap = new Map(
    (staff ?? []).map(
      (s: { id: string; full_name: string | null; email: string }) => [
        s.id,
        s.full_name ?? s.email,
      ],
    ),
  );

  const pending = rows.filter((r) => r.status === "pending_payout");
  const paid = rows.filter((r) => r.status === "paid");
  const salaryCovered = rows.filter((r) => r.status === "salary_covered");
  const voided = rows.filter((r) => r.status === "void");

  const totalPending = pending.reduce(
    (s, r) => s + Number(r.payout_amount_nok),
    0,
  );

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Utbetalinger</h1>
          <p className="text-text-2 text-sm">
            Hver rad = ett bekreftet salg fra Stripe (= første betaling
            gjennomført). UNIQUE-constraint sikrer at samme kunde aldri kan
            utløse provisjon to ganger.
          </p>
        </div>
        <Link
          href="/team/salg"
          className="text-sm text-orange hover:underline"
        >
          ← Tilbake til salgsoversikt
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Klar for utbetaling"
          value={`${totalPending.toLocaleString("nb-NO")} kr`}
          sub={`${pending.length} rader`}
          tone="green"
        />
        <SummaryCard
          label="Allerede utbetalt"
          value={`${paid.reduce((s, r) => s + Number(r.payout_amount_nok), 0).toLocaleString("nb-NO")} kr`}
          sub={`${paid.length} rader`}
        />
        <SummaryCard
          label="I fastlønn"
          value={`${salaryCovered.length}`}
          sub="salg 1–10/mnd"
        />
        <SummaryCard
          label="Void"
          value={`${voided.length}`}
          sub="refundert/feil"
        />
      </div>

      <Card>
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-text-1">
            Klar for utbetaling ({pending.length})
          </h3>
          <p className="text-xs text-text-3 mt-0.5">
            Marker som utbetalt etter at lønn er kjørt. Status låses og kan
            ikke endres tilbake.
          </p>
        </div>
        <CardBody className="!p-0">
          {pending.length === 0 ? (
            <div className="p-6 text-center text-text-3 text-sm">
              Ingen rader klar for utbetaling akkurat nå.
            </div>
          ) : (
            <UtbetalingerClient
              rows={pending.map((r) => ({
                ...r,
                firma: orgMap.get(r.organization_id) ?? "?",
                salesperson: staffMap.get(r.salesperson_id) ?? "?",
              }))}
            />
          )}
        </CardBody>
      </Card>

      {paid.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-border">
            <h3 className="font-semibold text-text-1">
              Historikk: utbetalte ({paid.length})
            </h3>
          </div>
          <CardBody className="!p-0">
            <ul className="divide-y divide-border">
              {paid.slice(0, 30).map((r) => (
                <li
                  key={r.id}
                  className="px-5 py-2.5 text-sm flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-text-1 truncate">
                      {orgMap.get(r.organization_id) ?? "?"}
                    </div>
                    <div className="text-xs text-text-3">
                      {staffMap.get(r.salesperson_id) ?? "?"} ·{" "}
                      {r.paid_at &&
                        new Date(r.paid_at).toLocaleDateString("nb-NO")}
                      {r.payout_ref ? ` · ${r.payout_ref}` : ""}
                    </div>
                  </div>
                  <div className="text-text-1 font-medium tabular-nums">
                    {Number(r.payout_amount_nok).toLocaleString("nb-NO")} kr
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "green";
}) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs text-text-3 uppercase tracking-wider">
          {label}
        </div>
        <div
          className={`text-xl font-semibold mt-1 ${tone === "green" ? "text-green" : "text-text-1"}`}
        >
          {value}
        </div>
        {sub && <div className="text-xs text-text-3 mt-0.5">{sub}</div>}
      </CardBody>
    </Card>
  );
}
