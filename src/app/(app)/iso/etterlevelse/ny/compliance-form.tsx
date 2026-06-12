"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { upsertCompliance } from "../../actions";
import type { ComplianceStatus } from "@/lib/types/database";

interface Profile {
  id: string;
  full_name: string | null;
}

export function ComplianceForm({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    regulation: "",
    requirement: "",
    reference_url: "",
    responsible_id: "",
    evidence_url: "",
    status: "under_review" as ComplianceStatus,
    next_review_date: "",
    notes: "",
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await upsertCompliance({
        regulation: form.regulation,
        requirement: form.requirement,
        reference_url: form.reference_url || undefined,
        responsible_id: form.responsible_id || undefined,
        evidence_url: form.evidence_url || undefined,
        status: form.status,
        next_review_date: form.next_review_date || undefined,
        notes: form.notes,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/iso/etterlevelse");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardBody>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Lov / forskrift" required>
            <Input
              value={form.regulation}
              onChange={(e) =>
                setForm({ ...form, regulation: e.target.value })
              }
              placeholder="F.eks. Forurensningsloven, FSE 2006"
              required
            />
          </Field>
          <Field label="Krav" required>
            <Textarea
              value={form.requirement}
              onChange={(e) =>
                setForm({ ...form, requirement: e.target.value })
              }
              rows={3}
              placeholder="Hva forskriften krever av virksomheten"
              required
            />
          </Field>
          <Field label="Referanse-URL">
            <Input
              type="url"
              value={form.reference_url}
              onChange={(e) =>
                setForm({ ...form, reference_url: e.target.value })
              }
              placeholder="https://lovdata.no/..."
            />
          </Field>
          <Field label="Evidens (URL eller dokumentreferanse)">
            <Input
              value={form.evidence_url}
              onChange={(e) =>
                setForm({ ...form, evidence_url: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as ComplianceStatus,
                  })
                }
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="under_review">Under vurdering</option>
                <option value="compliant">Etterlevd</option>
                <option value="non_compliant">Ikke etterlevd</option>
                <option value="not_applicable">Ikke relevant</option>
              </select>
            </Field>
            <Field label="Neste gjennomgang">
              <Input
                type="date"
                value={form.next_review_date}
                onChange={(e) =>
                  setForm({ ...form, next_review_date: e.target.value })
                }
              />
            </Field>
          </div>
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
          <Field label="Notater">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </Field>
          {error && <div className="text-sm text-red">{error}</div>}
          <Button type="submit" disabled={pending}>
            {pending ? "Lagrer…" : "Lagre"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
