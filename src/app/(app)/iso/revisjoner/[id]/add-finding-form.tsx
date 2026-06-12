"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createAuditFinding } from "../../actions";
import type { AuditFindingSeverity } from "@/lib/types/database";

export function AddFindingForm({ auditPlanId }: { auditPlanId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "observation" as AuditFindingSeverity,
    reference: "",
    createLinkedDeviation: false,
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("Tittel er påkrevd.");
      return;
    }
    startTransition(async () => {
      const res = await createAuditFinding({
        audit_plan_id: auditPlanId,
        title: form.title,
        description: form.description,
        severity: form.severity,
        reference: form.reference,
        createLinkedDeviation: form.createLinkedDeviation,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setForm({
        title: "",
        description: "",
        severity: "observation",
        reference: "",
        createLinkedDeviation: false,
      });
      router.refresh();
    });
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <Field label="Tittel" required>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Alvorlighet">
          <select
            value={form.severity}
            onChange={(e) =>
              setForm({
                ...form,
                severity: e.target.value as AuditFindingSeverity,
              })
            }
            className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="observation">Observasjon</option>
            <option value="minor">Minor</option>
            <option value="major">Major</option>
            <option value="critical">Kritisk</option>
          </select>
        </Field>
        <Field label="Referanse">
          <Input
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            placeholder="ISO 9001 7.5.3"
          />
        </Field>
      </div>
      <Field label="Beskrivelse">
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.createLinkedDeviation}
          onChange={(e) =>
            setForm({ ...form, createLinkedDeviation: e.target.checked })
          }
        />
        Opprett tilknyttet avvik (CAPA-flyt)
      </label>
      {error && <div className="text-sm text-red">{error}</div>}
      <Button type="submit" disabled={pending}>
        {pending ? "Lagrer…" : "Legg til funn"}
      </Button>
    </form>
  );
}
