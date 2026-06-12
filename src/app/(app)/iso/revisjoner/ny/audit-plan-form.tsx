"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { upsertAuditPlan } from "../../actions";

interface Profile {
  id: string;
  full_name: string | null;
}
interface Template {
  id: string;
  name: string;
}

export function AuditPlanForm({
  profiles,
  templates,
}: {
  profiles: Profile[];
  templates: Template[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    scope: "",
    auditor_id: "",
    external_auditor_name: "",
    planned_date: new Date().toISOString().slice(0, 10),
    checklist_template_id: "",
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await upsertAuditPlan({
        title: form.title,
        scope: form.scope,
        auditor_id: form.auditor_id || undefined,
        external_auditor_name: form.external_auditor_name || undefined,
        planned_date: form.planned_date,
        checklist_template_id: form.checklist_template_id || undefined,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/iso/revisjoner/${res.id}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardBody>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Tittel" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="F.eks. Intern revisjon Q2 — dokumentstyring"
              required
            />
          </Field>
          <Field label="Omfang / scope" required>
            <Textarea
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              rows={3}
              placeholder="Hvilke prosesser, avdelinger eller standarder dekkes?"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Auditor (intern)">
              <select
                value={form.auditor_id}
                onChange={(e) =>
                  setForm({ ...form, auditor_id: e.target.value })
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
            <Field label="Eller ekstern auditor (navn)">
              <Input
                value={form.external_auditor_name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    external_auditor_name: e.target.value,
                  })
                }
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Planlagt dato" required>
              <Input
                type="date"
                value={form.planned_date}
                onChange={(e) =>
                  setForm({ ...form, planned_date: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Sjekkliste-mal">
              <select
                value={form.checklist_template_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    checklist_template_id: e.target.value,
                  })
                }
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="">— Ingen —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {error && <div className="text-sm text-red">{error}</div>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Lagrer…" : "Opprett"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Avbryt
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
