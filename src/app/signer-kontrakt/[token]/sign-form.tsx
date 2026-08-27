"use client";

import { useState, useTransition } from "react";
import { SignaturePad } from "@/components/app/signature-pad";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Loader2, CheckCircle2 } from "lucide-react";
import {
  signContractAsEmployee,
  type ContractForSigning,
} from "./actions";

const ANSETTELSESFORM: Record<string, string> = {
  fast: "Fast ansettelse",
  midlertidig: "Midlertidig",
  vikariat: "Vikariat",
  laerling: "Lærling",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/60 last:border-0">
      <span className="text-text-3">{label}</span>
      <span className="text-text-1 text-right font-medium">{value}</span>
    </div>
  );
}

export function SignForm({
  token,
  contract,
}: {
  token: string;
  contract: ContractForSigning;
}) {
  const [name, setName] = useState(contract.employee_name);
  const [sig, setSig] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setErr(null);
    if (!sig) return setErr("Tegn signaturen din i feltet.");
    if (!name.trim()) return setErr("Skriv navnet ditt.");
    startTransition(async () => {
      const res = await signContractAsEmployee({
        token,
        signedName: name,
        signatureDataUrl: sig,
      });
      if (res.error) return setErr(res.error);
      if (res.ok) setDone(true);
    });
  }

  if (done) {
    return (
      <div className="rounded-lg border border-green/30 bg-green/10 p-6 text-center space-y-2">
        <CheckCircle2 className="size-8 text-green mx-auto" />
        <h1 className="text-lg font-semibold text-green">Avtalen er signert</h1>
        <p className="text-sm text-text-2">
          Takk, {name.trim()}! Du får snart en e-post for å sette passord og logge
          inn i Echoo.
        </p>
      </div>
    );
  }

  const lonn =
    contract.lonn_belop != null
      ? `${contract.lonn_belop.toLocaleString("no-NO")} kr ${
          contract.lonn_type === "timelonn" ? "/ time" : "/ år"
        }`
      : "—";

  return (
    <div className="space-y-6">
      <header className="text-center space-y-1">
        <h1 className="text-xl font-semibold">Arbeidsavtale</h1>
        {contract.organisasjon && (
          <p className="text-sm text-text-2">{contract.organisasjon}</p>
        )}
      </header>

      <div className="rounded-lg border border-border bg-card p-5 text-sm">
        <Row label="Ansatt" value={contract.employee_name} />
        <Row label="Stilling" value={contract.stilling ?? "—"} />
        <Row
          label="Ansettelsesform"
          value={ANSETTELSESFORM[contract.ansettelsesform] ?? contract.ansettelsesform}
        />
        <Row label="Stillingsprosent" value={`${contract.stillingsprosent} %`} />
        <Row label="Arbeidssted" value={contract.arbeidssted ?? "—"} />
        <Row label="Tiltredelse" value={contract.start_date ?? "—"} />
        <Row
          label="Prøvetid"
          value={
            contract.provetid_mnd > 0
              ? `${contract.provetid_mnd} mnd (til ${contract.provetid_slutt ?? "—"})`
              : "Ingen"
          }
        />
        <Row label="Lønn" value={lonn} />
        <Row label="Oppsigelsestid" value={`${contract.oppsigelsestid_mnd} mnd`} />
        {contract.terms?.tilleggsvilkaar && (
          <div className="pt-3 text-text-2">
            <div className="text-text-3 mb-1">Tilleggsvilkår</div>
            <p className="whitespace-pre-wrap">{contract.terms.tilleggsvilkaar}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <p className="text-sm text-text-2">
          Ved å signere bekrefter du at du godtar vilkårene i arbeidsavtalen over.
        </p>
        <Field label="Ditt navn" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div>
          <div className="text-sm font-medium mb-1.5">Signatur</div>
          <SignaturePad onChange={setSig} />
        </div>
        {err && (
          <div className="rounded-md bg-red/10 border border-red/30 text-red text-sm px-3 py-2">
            {err}
          </div>
        )}
        <Button type="button" onClick={submit} disabled={pending} className="w-full">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Signer avtalen
        </Button>
      </div>
    </div>
  );
}
