"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { upsertObjective } from "../actions";
import type { ObjectiveKind } from "@/lib/types/database";

interface Profile {
  id: string;
  full_name: string | null;
}

interface Props {
  initial?: {
    id: string;
    kind: ObjectiveKind;
    title: string;
    description: string | null;
    target_value: string | null;
    unit: string | null;
    deadline: string | null;
    responsible_id: string | null;
    measurement_method: string | null;
  };
  profiles: Profile[];
}

export function ObjectiveForm({ initial, profiles }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    kind: initial?.kind ?? "quality",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    target_value: initial?.target_value ?? "",
    unit: initial?.unit ?? "",
    deadline: initial?.deadline ?? "",
    responsible_id: initial?.responsible_id ?? "",
    measurement_method: initial?.measurement_method ?? "",
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await upsertObjective({
        id: initial?.id,
        kind: form.kind as ObjectiveKind,
        title: form.title,
        description: form.description,
        target_value: form.target_value,
        unit: form.unit,
        deadline: form.deadline,
        responsible_id: form.responsible_id || undefined,
        measurement_method: form.measurement_method,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/iso/maal/${res.id}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardBody>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Type mål">
            <select
              value={form.kind}
              onChange={(e) =>
                setForm({ ...form, kind: e.target.value as ObjectiveKind })
              }
              className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
            >
              <option value="quality">Kvalitetsmål</option>
              <option value="environment">Miljømål</option>
            </select>
          </Field>
          <Field label="Tittel" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="F.eks. Redusere kundeklager med 20%"
              required
            />
          </Field>
          <Field label="Beskrivelse">
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Målverdi">
              <Input
                value={form.target_value}
                onChange={(e) =>
                  setForm({ ...form, target_value: e.target.value })
                }
                placeholder="< 3 / 95%"
              />
            </Field>
            <Field label="Enhet">
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="%, antall, kg"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Frist">
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) =>
                  setForm({ ...form, deadline: e.target.value })
                }
              />
            </Field>
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
          </div>
          <Field label="Målemetode">
            <Textarea
              value={form.measurement_method}
              onChange={(e) =>
                setForm({ ...form, measurement_method: e.target.value })
              }
              rows={2}
              placeholder="Hvordan vil dere måle progresjon? Hvor ofte?"
            />
          </Field>
          {error && <div className="text-sm text-red">{error}</div>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Lagrer…" : "Lagre"}
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
