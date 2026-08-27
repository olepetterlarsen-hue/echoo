"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Sparkles, ShieldCheck, Send, Loader2, CheckCircle2 } from "lucide-react";
import {
  saveContractDraft,
  aiCheckContract,
  aiSuggestClause,
  sendContractForSigning,
  type ContractInput,
} from "./actions";
import type { KontraktIssue, KontraktFelter } from "@/lib/ai/skills/kontrakt";

type Form = {
  employee_name: string;
  employee_email: string;
  stilling: string;
  ansettelsesform: "fast" | "midlertidig" | "vikariat" | "laerling";
  stillingsprosent: string;
  arbeidssted: string;
  start_date: string;
  provetid_mnd: string;
  lonn_type: "fastlonn" | "timelonn";
  lonn_belop: string;
  oppsigelsestid_mnd: string;
  tilleggsvilkaar: string;
};

const EMPTY: Form = {
  employee_name: "",
  employee_email: "",
  stilling: "",
  ansettelsesform: "fast",
  stillingsprosent: "100",
  arbeidssted: "",
  start_date: "",
  provetid_mnd: "6",
  lonn_type: "fastlonn",
  lonn_belop: "",
  oppsigelsestid_mnd: "1",
  tilleggsvilkaar: "",
};

export function ContractForm({
  initialId,
  initial,
}: {
  initialId?: string;
  initial?: Partial<Form>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>({ ...EMPTY, ...initial });
  const [id, setId] = useState<string | undefined>(initialId);
  const [issues, setIssues] = useState<KontraktIssue[] | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toInput(): ContractInput {
    return {
      id,
      employee_name: form.employee_name,
      employee_email: form.employee_email,
      stilling: form.stilling,
      ansettelsesform: form.ansettelsesform,
      stillingsprosent: Number(form.stillingsprosent) || 100,
      arbeidssted: form.arbeidssted,
      start_date: form.start_date || undefined,
      provetid_mnd: Number(form.provetid_mnd),
      lonn_type: form.lonn_type,
      lonn_belop: form.lonn_belop ? Number(form.lonn_belop) : null,
      oppsigelsestid_mnd: Number(form.oppsigelsestid_mnd) || 1,
      terms: form.tilleggsvilkaar ? { tilleggsvilkaar: form.tilleggsvilkaar } : {},
    };
  }

  function felter(): KontraktFelter {
    return {
      employee_name: form.employee_name,
      stilling: form.stilling,
      ansettelsesform: form.ansettelsesform,
      stillingsprosent: Number(form.stillingsprosent) || 100,
      arbeidssted: form.arbeidssted,
      start_date: form.start_date || undefined,
      provetid_mnd: Number(form.provetid_mnd),
      lonn_type: form.lonn_type,
      lonn_belop: form.lonn_belop ? Number(form.lonn_belop) : undefined,
      oppsigelsestid_mnd: Number(form.oppsigelsestid_mnd) || 1,
      terms: form.tilleggsvilkaar ? { tilleggsvilkaar: form.tilleggsvilkaar } : {},
    };
  }

  async function save(): Promise<string | undefined> {
    const res = await saveContractDraft(toInput());
    if (res.error) {
      setMsg({ kind: "err", text: res.error });
      return undefined;
    }
    if (res.id) setId(res.id);
    return res.id;
  }

  function onSaveDraft() {
    setMsg(null);
    startTransition(async () => {
      const savedId = await save();
      if (savedId) setMsg({ kind: "ok", text: "Utkast lagret." });
    });
  }

  function onSuggest() {
    setMsg(null);
    setBusy("suggest");
    startTransition(async () => {
      const res = await aiSuggestClause({
        felter: felter(),
        klausul: "Tilleggsvilkår / særskilte bestemmelser i arbeidsavtalen",
      });
      setBusy(null);
      if (res.error) return setMsg({ kind: "err", text: res.error });
      if (res.text) set("tilleggsvilkaar", res.text);
    });
  }

  function onAiCheck() {
    setMsg(null);
    setIssues(null);
    setBusy("check");
    startTransition(async () => {
      const res = await aiCheckContract(felter());
      setBusy(null);
      if (res.error) return setMsg({ kind: "err", text: res.error });
      setIssues(res.issues ?? []);
    });
  }

  function onSend() {
    setMsg(null);
    setSignUrl(null);
    setBusy("send");
    startTransition(async () => {
      const savedId = id ?? (await save());
      if (!savedId) return setBusy(null);
      const res = await sendContractForSigning(savedId);
      setBusy(null);
      if (res.error) return setMsg({ kind: "err", text: res.error });
      if (res.url) {
        setSignUrl(res.url);
        setMsg({
          kind: "ok",
          text: "Avtalen er signert av deg og klar for ansatt. Del lenken under.",
        });
        router.refresh();
      }
    });
  }

  const hardErrors = (issues ?? []).filter((i) => i.alvorlighet === "feil");

  return (
    <div className="space-y-6 max-w-3xl">
      {msg && (
        <div
          className={`rounded-md px-3 py-2 text-sm border ${
            msg.kind === "ok"
              ? "bg-green/10 border-green/30 text-green"
              : "bg-red/10 border-red/30 text-red"
          }`}
        >
          {msg.text}
        </div>
      )}

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold">Ansatt</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Fullt navn" required>
              <Input
                value={form.employee_name}
                onChange={(e) => set("employee_name", e.target.value)}
                placeholder="Ola Nordmann"
              />
            </Field>
            <Field label="E-post" required hint="Brukerkonto opprettes ved signering.">
              <Input
                type="email"
                value={form.employee_email}
                onChange={(e) => set("employee_email", e.target.value)}
                placeholder="ola@firma.no"
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold">Stilling og vilkår</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Stilling / tittel">
              <Input
                value={form.stilling}
                onChange={(e) => set("stilling", e.target.value)}
                placeholder="Elektriker"
              />
            </Field>
            <Field label="Ansettelsesform">
              <Select
                value={form.ansettelsesform}
                onChange={(v) => set("ansettelsesform", v as Form["ansettelsesform"])}
                options={[
                  ["fast", "Fast ansettelse"],
                  ["midlertidig", "Midlertidig"],
                  ["vikariat", "Vikariat"],
                  ["laerling", "Lærling"],
                ]}
              />
            </Field>
            <Field label="Stillingsprosent">
              <Input
                type="number"
                min={1}
                max={100}
                value={form.stillingsprosent}
                onChange={(e) => set("stillingsprosent", e.target.value)}
              />
            </Field>
            <Field label="Arbeidssted">
              <Input
                value={form.arbeidssted}
                onChange={(e) => set("arbeidssted", e.target.value)}
                placeholder="Mo i Rana"
              />
            </Field>
            <Field label="Tiltredelsesdato" required>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
              />
            </Field>
            <Field label="Prøvetid (måneder)" hint="Maks 6 mnd (aml. § 15-6).">
              <Select
                value={form.provetid_mnd}
                onChange={(v) => set("provetid_mnd", v)}
                options={[
                  ["0", "Ingen prøvetid"],
                  ["3", "3 måneder"],
                  ["6", "6 måneder"],
                ]}
              />
            </Field>
            <Field label="Lønnstype">
              <Select
                value={form.lonn_type}
                onChange={(v) => set("lonn_type", v as Form["lonn_type"])}
                options={[
                  ["fastlonn", "Fast årslønn"],
                  ["timelonn", "Timelønn"],
                ]}
              />
            </Field>
            <Field
              label={form.lonn_type === "timelonn" ? "Timelønn (kr)" : "Årslønn (kr)"}
            >
              <Input
                type="number"
                min={0}
                value={form.lonn_belop}
                onChange={(e) => set("lonn_belop", e.target.value)}
              />
            </Field>
            <Field label="Oppsigelsestid (måneder)">
              <Input
                type="number"
                min={0}
                value={form.oppsigelsestid_mnd}
                onChange={(e) => set("oppsigelsestid_mnd", e.target.value)}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Tilleggsvilkår</h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onSuggest}
              disabled={pending}
            >
              {busy === "suggest" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Foreslå tekst
            </Button>
          </div>
          <Textarea
            rows={5}
            value={form.tilleggsvilkaar}
            onChange={(e) => set("tilleggsvilkaar", e.target.value)}
            placeholder="Særskilte bestemmelser, f.eks. om utstyr, taushetsplikt, reise …"
          />
        </CardBody>
      </Card>

      {issues && (
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="size-4 text-orange" />
              AI-sjekk
            </div>
            {issues.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green">
                <CheckCircle2 className="size-4" /> Ingen selvmotsigelser funnet.
              </div>
            ) : (
              <ul className="space-y-2">
                {issues.map((i, idx) => (
                  <li
                    key={idx}
                    className={`text-sm rounded-md px-3 py-2 border ${
                      i.alvorlighet === "feil"
                        ? "bg-red/10 border-red/30 text-red"
                        : i.alvorlighet === "advarsel"
                          ? "bg-yellow/10 border-yellow/30 text-yellow"
                          : "bg-card border-border text-text-2"
                    }`}
                  >
                    <span className="font-medium">{i.felt}:</span> {i.melding}
                    {i.forslag && (
                      <div className="text-xs mt-1 opacity-80">
                        Forslag: {i.forslag}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {signUrl && (
        <Card>
          <CardBody className="space-y-2">
            <div className="font-semibold text-sm">Signeringslenke til ansatt</div>
            <p className="text-xs text-text-3">
              Del denne med den ansatte. De signerer uten å logge inn; brukerkonto
              opprettes automatisk når de har signert.
            </p>
            <Input readOnly value={signUrl} onFocus={(e) => e.currentTarget.select()} />
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onSaveDraft} disabled={pending}>
          Lagre utkast
        </Button>
        <Button type="button" variant="secondary" onClick={onAiCheck} disabled={pending}>
          {busy === "check" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
          AI-sjekk
        </Button>
        <Button
          type="button"
          onClick={onSend}
          disabled={pending || hardErrors.length > 0}
          title={
            hardErrors.length > 0
              ? "Rett opp feilene fra AI-sjekken først."
              : undefined
          }
        >
          {busy === "send" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Signer og send til ansatt
        </Button>
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 rounded-md px-3 text-base sm:text-sm bg-surface border border-border focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/20"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}
