"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { upsertAspect } from "../../actions";
import type { AspectCategory, AspectLifecycle } from "@/lib/types/database";

interface Profile {
  id: string;
  full_name: string | null;
}
interface Substance {
  id: string;
  name: string;
}

const CATEGORIES: { v: AspectCategory; label: string }[] = [
  { v: "waste", label: "Avfall" },
  { v: "energy", label: "Energi" },
  { v: "water", label: "Vann" },
  { v: "emissions_air", label: "Luftutslipp" },
  { v: "chemicals", label: "Kjemikalier" },
  { v: "noise", label: "Støy" },
  { v: "soil", label: "Jord" },
  { v: "biodiversity", label: "Biologisk mangfold" },
  { v: "resources", label: "Ressurser" },
  { v: "other", label: "Annet" },
];

export function AspectForm({
  profiles,
  substances,
}: {
  profiles: Profile[];
  substances: Substance[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "waste" as AspectCategory,
    lifecycle: "normal" as AspectLifecycle,
    frequency_score: 3,
    severity_score: 3,
    control_measures: "",
    linked_substance_id: "",
    responsible_id: "",
  });

  const computed = form.frequency_score * form.severity_score;
  const isSignificant = computed >= 12;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await upsertAspect({
        title: form.title,
        description: form.description,
        category: form.category,
        lifecycle: form.lifecycle,
        frequency_score: form.frequency_score,
        severity_score: form.severity_score,
        is_significant: isSignificant,
        control_measures: form.control_measures,
        linked_substance_id: form.linked_substance_id || undefined,
        responsible_id: form.responsible_id || undefined,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/iso/miljoaspekter");
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
            <Field label="Kategori">
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value as AspectCategory,
                  })
                }
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.v} value={c.v}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Livssyklus">
              <select
                value={form.lifecycle}
                onChange={(e) =>
                  setForm({
                    ...form,
                    lifecycle: e.target.value as AspectLifecycle,
                  })
                }
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="normal">Normal drift</option>
                <option value="abnormal">Avvikende drift</option>
                <option value="emergency">Beredskap</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label={`Frekvens (1–5): ${form.frequency_score}`}>
              <input
                type="range"
                min={1}
                max={5}
                value={form.frequency_score}
                onChange={(e) =>
                  setForm({
                    ...form,
                    frequency_score: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </Field>
            <Field label={`Alvorlighet (1–5): ${form.severity_score}`}>
              <input
                type="range"
                min={1}
                max={5}
                value={form.severity_score}
                onChange={(e) =>
                  setForm({
                    ...form,
                    severity_score: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </Field>
          </div>
          <div className="bg-card-hover rounded-md px-3 py-2 text-sm">
            Significance score: <strong>{computed}</strong>{" "}
            {isSignificant ? (
              <span className="text-orange">— signifikant</span>
            ) : (
              <span className="text-text-3">— ikke signifikant</span>
            )}
          </div>
          <Field label="Tiltak / kontroll">
            <Textarea
              value={form.control_measures}
              onChange={(e) =>
                setForm({ ...form, control_measures: e.target.value })
              }
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
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
            <Field label="Knyttet til stoffkartotek">
              <select
                value={form.linked_substance_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    linked_substance_id: e.target.value,
                  })
                }
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="">— Ingen —</option>
                {substances.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {error && <div className="text-sm text-red">{error}</div>}
          <Button type="submit" disabled={pending}>
            {pending ? "Lagrer…" : "Lagre"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
