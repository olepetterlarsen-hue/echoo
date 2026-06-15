"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPayout, voidLedgerRow } from "./actions";

interface Row {
  id: string;
  firma: string;
  salesperson: string;
  payout_amount_nok: number;
  confirmed_at: string;
  stripe_invoice_id: string | null;
}

export function UtbetalingerClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [payoutRef, setPayoutRef] = useState("");
  const [notes, setNotes] = useState("");

  // Group by salesperson for periodisering
  const bySales = new Map<string, Row[]>();
  for (const r of rows) {
    const arr = bySales.get(r.salesperson) ?? [];
    arr.push(r);
    bySales.set(r.salesperson, arr);
  }

  function confirmPayout(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await markPayout({
        ledger_id: id,
        payout_ref: payoutRef,
        notes: notes,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpenRow(null);
      setPayoutRef("");
      setNotes("");
      router.refresh();
    });
  }

  function confirmVoid(id: string) {
    const reason = prompt(
      "Hvorfor void? (f.eks. 'refundert innen 14 dager', 'feilbokført')",
    );
    if (!reason) return;
    setError(null);
    startTransition(async () => {
      const res = await voidLedgerRow({ ledger_id: id, reason });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      {error && (
        <div className="px-5 py-2 text-sm text-red bg-red/10 border-b border-border">
          {error}
        </div>
      )}
      {Array.from(bySales.entries()).map(([sales, arr]) => {
        const subtotal = arr.reduce(
          (s, r) => s + Number(r.payout_amount_nok),
          0,
        );
        return (
          <div key={sales} className="border-b border-border last:border-b-0">
            <div className="px-5 py-2 bg-card-hover flex items-center justify-between text-xs">
              <div className="font-medium text-text-1">{sales}</div>
              <div className="text-text-2 tabular-nums">
                {arr.length} rader · {subtotal.toLocaleString("nb-NO")} kr
              </div>
            </div>
            <ul className="divide-y divide-border">
              {arr.map((r) => (
                <li key={r.id} className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-1 truncate">
                        {r.firma}
                      </div>
                      <div className="text-xs text-text-3">
                        Bekreftet{" "}
                        {new Date(r.confirmed_at).toLocaleDateString("nb-NO")}
                        {r.stripe_invoice_id
                          ? ` · ${r.stripe_invoice_id}`
                          : ""}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-text-1 tabular-nums">
                      {Number(r.payout_amount_nok).toLocaleString("nb-NO")} kr
                    </div>
                    {openRow === r.id ? null : (
                      <>
                        <button
                          onClick={() => {
                            setOpenRow(r.id);
                            setPayoutRef("");
                            setNotes("");
                          }}
                          disabled={pending}
                          className="px-3 py-1.5 bg-green text-bg rounded text-xs font-medium hover:opacity-90"
                        >
                          Marker utbetalt
                        </button>
                        <button
                          onClick={() => confirmVoid(r.id)}
                          disabled={pending}
                          className="px-2 py-1.5 text-text-3 hover:text-red text-xs"
                          title="Void (refundert/feilbokført)"
                        >
                          Void
                        </button>
                      </>
                    )}
                  </div>
                  {openRow === r.id && (
                    <div className="mt-3 pl-0 space-y-2 border-l-2 border-orange pl-3">
                      <input
                        type="text"
                        value={payoutRef}
                        onChange={(e) => setPayoutRef(e.target.value)}
                        placeholder="Bilagsnr / lønnsrun-ref (valgfritt)"
                        className="w-full bg-card border border-border rounded px-2 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notat (valgfritt)"
                        className="w-full bg-card border border-border rounded px-2 py-1.5 text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setOpenRow(null)}
                          className="px-3 py-1.5 text-text-2 hover:text-text-1 text-xs"
                        >
                          Avbryt
                        </button>
                        <button
                          onClick={() => confirmPayout(r.id)}
                          disabled={pending}
                          className="px-3 py-1.5 bg-green text-bg rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          {pending ? "Lagrer..." : "Bekreft utbetalt"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
