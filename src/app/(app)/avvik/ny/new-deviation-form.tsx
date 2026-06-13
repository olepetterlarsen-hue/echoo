"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { createDeviationFromForm } from "./actions";
import type {
  DeviationSeverity,
  DeviationRootCauseCategory,
} from "@/lib/types/database";
import type { AvvikDraft } from "@/lib/ai/skills/avvik";

interface Project {
  id: string;
  project_number: string;
  title: string;
}
interface Profile {
  id: string;
  full_name: string | null;
}

const DRAFT_STORAGE_KEY = "echoo:avvik_draft";

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

interface FormState {
  project_id: string;
  title: string;
  description: string;
  severity: DeviationSeverity;
  assigned_to: string;
  root_cause_category: DeviationRootCauseCategory | "";
  root_cause_description: string;
  containment_action: string;
  corrective_action: string;
  responsible_id: string;
  due_date: string;
  ai_generated: boolean;
}

export function NewDeviationForm({
  projects,
  profiles,
  fromAi,
}: {
  projects: Project[];
  profiles: Profile[];
  fromAi: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    project_id: "",
    title: "",
    description: "",
    severity: "middels",
    assigned_to: "",
    root_cause_category: "",
    root_cause_description: "",
    containment_action: "",
    corrective_action: "",
    responsible_id: "",
    due_date: "",
    ai_generated: false,
  });

  // Last AI-utkast fra localStorage hvis vi kom fra assistenten
  useEffect(() => {
    if (!fromAi) return;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as AvvikDraft;
      setForm((f) => ({
        ...f,
        title: draft.title || f.title,
        description: draft.description || f.description,
        severity: draft.severity || f.severity,
        root_cause_category: draft.root_cause_category || "",
        root_cause_description: draft.root_cause_description || "",
        containment_action: draft.containment_action || "",
        corrective_action: draft.corrective_action || "",
        ai_generated: true,
      }));
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [fromAi]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.project_id) {
      setError("Velg prosjekt.");
      return;
    }
    if (!form.title.trim()) {
      setError("Tittel er påkrevd.");
      return;
    }
    startTransition(async () => {
      const res = await createDeviationFromForm({
        project_id: form.project_id,
        title: form.title,
        description: form.description,
        severity: form.severity,
        assigned_to: form.assigned_to || null,
        root_cause_category: form.root_cause_category || null,
        root_cause_description: form.root_cause_description,
        containment_action: form.containment_action,
        corrective_action: form.corrective_action,
        responsible_id: form.responsible_id || null,
        due_date: form.due_date || null,
        ai_generated: form.ai_generated,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/avvik/${res.id}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardBody>
        {form.ai_generated && (
          <div className="mb-4 flex items-start gap-2 bg-orange/10 border border-orange/30 rounded-md px-3 py-2 text-sm">
            <Sparkles className="size-4 text-orange mt-0.5 shrink-0" />
            <div className="text-orange">
              Feltene under er AI-utkast. Sjekk dem nøye — du som signerer
              står ansvarlig for innholdet.
            </div>
          </div>
        )}
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Prosjekt" required>
            <select
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
              required
            >
              <option value="">— Velg prosjekt —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_number} · {p.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tittel" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={200}
            />
          </Field>

          <Field label="Beskrivelse">
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={4}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Alvorlighet">
              <select
                value={form.severity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    severity: e.target.value as DeviationSeverity,
                  })
                }
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="lav">Lav</option>
                <option value="middels">Middels</option>
                <option value="hoey">Høy</option>
                <option value="kritisk">Kritisk</option>
              </select>
            </Field>
            <Field label="Tildelt">
              <select
                value={form.assigned_to}
                onChange={(e) =>
                  setForm({ ...form, assigned_to: e.target.value })
                }
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="">— Ingen —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <details
            className="border border-border rounded-md"
            open={form.ai_generated}
          >
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              CAPA — rotårsak og tiltak
            </summary>
            <div className="p-3 space-y-3 border-t border-border">
              <div className="grid grid-cols-1 gap-3">
                <Field label="Rotårsak-kategori">
                  <select
                    value={form.root_cause_category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        root_cause_category: e.target
                          .value as DeviationRootCauseCategory,
                      })
                    }
                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">— Ikke valgt —</option>
                    {ROOT_CAUSE_OPTIONS.map((o) => (
                      <option key={o.v} value={o.v}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Rotårsak — beskrivelse">
                  <Textarea
                    value={form.root_cause_description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        root_cause_description: e.target.value,
                      })
                    }
                    rows={2}
                  />
                </Field>
                <Field label="Umiddelbart tiltak (containment)">
                  <Textarea
                    value={form.containment_action}
                    onChange={(e) =>
                      setForm({ ...form, containment_action: e.target.value })
                    }
                    rows={2}
                  />
                </Field>
                <Field label="Korrigerende tiltak">
                  <Textarea
                    value={form.corrective_action}
                    onChange={(e) =>
                      setForm({ ...form, corrective_action: e.target.value })
                    }
                    rows={2}
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
                      onChange={(e) =>
                        setForm({ ...form, due_date: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
            </div>
          </details>

          {error && <div className="text-sm text-red">{error}</div>}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Button type="submit" disabled={pending}>
              {pending ? "Lagrer…" : "Opprett avvik"}
            </Button>
            <Link href="/avvik">
              <Button type="button" variant="ghost">
                Avbryt
              </Button>
            </Link>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
