"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Camera, Sparkles, X } from "lucide-react";
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
  image_files: File[];
  image_previews: string[];
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Initial form-state — last AI-utkast fra localStorage via useState-
  // initializer hvis vi kom fra assistenten. Lazy init kjører kun på mount,
  // ikke i en useEffect — det unngår cascade-render og lint-warning.
  const [form, setForm] = useState<FormState>(() => {
    const base: FormState = {
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
      image_files: [],
      image_previews: [],
    };
    if (!fromAi || typeof window === "undefined") return base;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return base;
      const draft = JSON.parse(raw) as AvvikDraft;
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return {
        ...base,
        title: draft.title || base.title,
        description: draft.description || base.description,
        severity: draft.severity || base.severity,
        root_cause_category: draft.root_cause_category || "",
        root_cause_description: draft.root_cause_description || "",
        containment_action: draft.containment_action || "",
        corrective_action: draft.corrective_action || "",
        ai_generated: true,
        image_files: [],
        image_previews: [],
      };
    } catch {
      return base;
    }
  });

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
      const fd = new FormData();
      form.image_files.forEach((f) => fd.append("images", f));
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
        images: form.image_files,
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

          <div>
            <div className="text-xs uppercase tracking-wider text-text-3 mb-1.5">
              Bilder (valgfritt, maks 10)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []).slice(0, 10 - form.image_files.length);
                if (!files.length) return;
                const previews = files.map((f) => URL.createObjectURL(f));
                setForm((prev) => ({
                  ...prev,
                  image_files: [...prev.image_files, ...files].slice(0, 10),
                  image_previews: [...prev.image_previews, ...previews].slice(0, 10),
                }));
                e.target.value = "";
              }}
            />
            {form.image_previews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.image_previews.map((src, i) => (
                  <div key={i} className="relative size-20 rounded-md overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Bilde ${i + 1}`} className="object-cover w-full h-full" />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          image_files: prev.image_files.filter((_, j) => j !== i),
                          image_previews: prev.image_previews.filter((_, j) => j !== i),
                        }))
                      }
                      className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={form.image_files.length >= 10}
            >
              <Camera className="size-4 mr-1.5" />
              {form.image_files.length === 0 ? "Legg til bilde" : "Legg til flere"}
            </Button>
          </div>

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
