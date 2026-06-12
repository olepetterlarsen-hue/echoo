"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateCapa } from "../../iso/actions";
import type { DeviationRootCauseCategory } from "@/lib/types/database";

interface Profile {
  id: string;
  full_name: string | null;
}

interface Initial {
  root_cause_category: DeviationRootCauseCategory | null;
  root_cause_description: string | null;
  containment_action: string | null;
  containment_at: string | null;
  corrective_action: string | null;
  responsible_id: string | null;
  due_date: string | null;
  verification_evidence: string | null;
  verified_at: string | null;
  verified_by_name: string | null;
}

const ROOT_CAUSE_OPTIONS: { v: DeviationRootCauseCategory; label: string }[] = [
  { v: "menneskelig_feil", label: "Menneskelig feil" },
  { v: "manglende_opplaering", label: "Manglende opplæring" },
  { v: "utilstrekkelig_prosedyre", label: "Utilstrekkelig prosedyre" },
  { v: "materiell_svikt", label: "Materiell svikt" },
  { v: "feil_verktoey", label: "Feil verktøy/utstyr" },
  { v: "miljoe_forhold", label: "Miljø/forhold" },
  { v: "kommunikasjon", label: "Kommunikasjonssvikt" },
  { v: "leverandoer", label: "Leverandør" },
  { v: "design_feil", label: "Designfeil" },
  { v: "annet", label: "Annet" },
];

export function CapaForm({
  deviationId,
  initial,
  profiles,
}: {
  deviationId: string;
  initial: Initial;
  profiles: Profile[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    root_cause_category: initial.root_cause_category ?? "",
    root_cause_description: initial.root_cause_description ?? "",
    containment_action: initial.containment_action ?? "",
    corrective_action: initial.corrective_action ?? "",
    responsible_id: initial.responsible_id ?? "",
    due_date: initial.due_date ?? "",
    verification_evidence: initial.verification_evidence ?? "",
  });

  const verified = !!initial.verified_at;

  function save(verify = false) {
    setError(null);
    startTransition(async () => {
      const res = await updateCapa({
        deviationId,
        root_cause_category: form.root_cause_category || undefined,
        root_cause_description: form.root_cause_description,
        containment_action: form.containment_action,
        corrective_action: form.corrective_action,
        responsible_id: form.responsible_id || undefined,
        due_date: form.due_date || undefined,
        verification_evidence: form.verification_evidence,
        verify,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-text-3 font-semibold">
          1. Rotårsak
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Kategori">
            <select
              value={form.root_cause_category}
              onChange={(e) =>
                setForm({ ...form, root_cause_category: e.target.value })
              }
              className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
            >
              <option value="">— Velg —</option>
              {ROOT_CAUSE_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Beskrivelse av rotårsak">
          <Textarea
            value={form.root_cause_description}
            onChange={(e) =>
              setForm({ ...form, root_cause_description: e.target.value })
            }
            rows={3}
            placeholder="Hvorfor oppstod avviket? Bruk gjerne 5 Whys."
          />
        </Field>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-text-3 font-semibold">
          2. Umiddelbart tiltak (containment)
        </h3>
        <Field
          label="Hva ble gjort umiddelbart for å hindre videre skade?"
          hint={
            initial.containment_at
              ? `Registrert ${new Date(initial.containment_at).toLocaleDateString("nb-NO")}`
              : undefined
          }
        >
          <Textarea
            value={form.containment_action}
            onChange={(e) =>
              setForm({ ...form, containment_action: e.target.value })
            }
            rows={3}
          />
        </Field>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-text-3 font-semibold">
          3. Korrektivt tiltak
        </h3>
        <Field label="Hva må gjøres for å hindre gjentakelse?">
          <Textarea
            value={form.corrective_action}
            onChange={(e) =>
              setForm({ ...form, corrective_action: e.target.value })
            }
            rows={3}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ansvarlig">
            <select
              value={form.responsible_id}
              onChange={(e) =>
                setForm({ ...form, responsible_id: e.target.value })
              }
              className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
            >
              <option value="">— Velg —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Frist">
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-text-3 font-semibold">
          4. Verifikasjon
          {verified && (
            <span className="ml-2 text-text-1 normal-case">
              ✓ Verifisert {initial.verified_at && new Date(initial.verified_at).toLocaleDateString("nb-NO")} {initial.verified_by_name && `av ${initial.verified_by_name}`}
            </span>
          )}
        </h3>
        <Field
          label="Evidens for at tiltaket virker"
          hint="Bilder, måleresultater, kontrollrunder etc."
        >
          <Textarea
            value={form.verification_evidence}
            onChange={(e) =>
              setForm({ ...form, verification_evidence: e.target.value })
            }
            rows={3}
          />
        </Field>
      </section>

      {error && <div className="text-sm text-red">{error}</div>}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        <Button type="submit" disabled={pending}>
          {pending ? "Lagrer…" : "Lagre"}
        </Button>
        {!verified && (
          <Button
            type="button"
            variant="secondary"
            disabled={pending || !form.verification_evidence.trim()}
            onClick={() => save(true)}
          >
            Verifiser tiltakets effektivitet
          </Button>
        )}
      </div>
    </form>
  );
}
