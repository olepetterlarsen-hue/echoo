"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Sparkles, X } from "lucide-react";
import { generateTeams } from "./actions";

export function GenerateOpTeamsButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    prefix: "Team-",
    count: 5,
    pad: 2,
    description_template: "Team {name} — feltteam for prosjektutførelse.",
  });

  function preview(): string[] {
    const out: string[] = [];
    for (let n = 0; n < Math.min(form.count, 4); n++) {
      const num = n + 1;
      out.push(
        form.pad
          ? `${form.prefix}${String(num).padStart(form.pad, "0")}`
          : `${form.prefix}${num}`,
      );
    }
    if (form.count > 4) out.push("…");
    return out;
  }

  function submit() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await generateTeams(form);
      if (res.error) {
        setError(res.error);
        return;
      }
      setResult(
        `Opprettet ${res.created} grupper. ${res.skipped > 0 ? `Hoppet over ${res.skipped} som allerede fantes.` : ""}`,
      );
      router.refresh();
      if (res.created > 0) {
        setTimeout(() => setOpen(false), 1200);
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm">
        <Sparkles className="size-4" />
        Generer flere grupper…
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 grid place-items-center px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-surface border border-border rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-orange" />
                Generer team-grupper
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-text-3 hover:text-text-1"
                aria-label="Lukk"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-text-3">
                Lager flere grupper i én operasjon med konsekvent navne-mønster
                og fargepalett. Eksisterende navn hoppes over automatisk.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Prefiks" required>
                  <Input
                    value={form.prefix}
                    onChange={(e) =>
                      setForm({ ...form, prefix: e.target.value })
                    }
                    placeholder="Team-"
                  />
                </Field>
                <Field label="Antall">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.count}
                    onChange={(e) =>
                      setForm({ ...form, count: Number(e.target.value) || 1 })
                    }
                  />
                </Field>
                <Field label="Padding">
                  <Input
                    type="number"
                    min={0}
                    max={4}
                    value={form.pad}
                    onChange={(e) =>
                      setForm({ ...form, pad: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
              </div>

              <Field
                label="Beskrivelse-mal"
                hint="Bruk {name} og {num} som plassholdere."
              >
                <Input
                  value={form.description_template}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description_template: e.target.value,
                    })
                  }
                  placeholder="Team {name} — feltteam"
                />
              </Field>

              <div className="bg-card border border-border rounded-md px-3 py-2 text-sm">
                <div className="text-xs text-text-3 mb-1">Forhåndsvisning:</div>
                <div className="flex flex-wrap gap-1.5">
                  {preview().map((n) => (
                    <span
                      key={n}
                      className="inline-flex items-center rounded-full bg-orange/15 text-orange border border-orange/30 px-2 py-0.5 text-xs"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              {error && <div className="text-sm text-red">{error}</div>}
              {result && (
                <div className="text-sm text-green bg-green/10 border border-green/30 rounded px-3 py-2">
                  {result}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Avbryt
                </Button>
                <Button onClick={submit} disabled={pending}>
                  {pending ? "Genererer…" : `Generer ${form.count} grupper`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
