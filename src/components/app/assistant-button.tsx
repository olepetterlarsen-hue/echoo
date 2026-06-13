"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askAvvikAssistant } from "@/app/(app)/actions/assistant";
import type { AvvikDraft } from "@/lib/ai/skills/avvik";

const DRAFT_STORAGE_KEY = "echoo:avvik_draft";

type Skill = "avvik";

export function AssistantButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [skill] = useState<Skill>("avvik");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<AvvikDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
  }

  function reset() {
    setDescription("");
    setDraft(null);
    setError(null);
  }

  function onGenerate() {
    if (!description.trim() && !draft) return;
    setError(null);
    startTransition(async () => {
      const res = await askAvvikAssistant({
        description,
        previousDraft: draft ?? undefined,
        userFeedback: draft ? description : undefined,
      });
      if (res.error || !res.draft) {
        setError(res.error ?? "Klarte ikke generere utkast.");
        return;
      }
      setDraft(res.draft);
      setDescription("");
    });
  }

  function useDraft() {
    if (!draft) return;
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore — localStorage kan være disabled
    }
    close();
    router.push("/avvik/ny?from_ai=1");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="AI-assistent"
        className="fixed bottom-4 right-44 z-40 inline-flex items-center gap-2 rounded-full bg-orange/20 text-orange border border-orange/40 px-4 py-2.5 text-sm font-semibold shadow-lg hover:bg-orange/30 transition-colors"
      >
        <Sparkles className="size-4" />
        <span className="hidden sm:inline">AI-assistent</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={close}
        >
          <aside
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-surface border-l border-border shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-orange" />
                Echoo AI-assistent
              </h2>
              <button
                type="button"
                onClick={close}
                className="text-text-3 hover:text-text-1"
                aria-label="Lukk"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-border text-xs text-text-3">
              Beskriv en hendelse → AI lager et avvik-utkast (alvorlighet,
              rotårsak, strakstiltak, korrigerende tiltak). Du må alltid se
              gjennom og godkjenne før det lagres.
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!draft && (
                <div className="text-sm text-text-2 space-y-2">
                  <p>
                    <strong>Eksempler:</strong>
                  </p>
                  <ul className="text-text-3 text-xs space-y-1.5 list-disc list-inside">
                    <li>
                      &quot;Glemte å koble jordleder før spenning på, oppdaget
                      under sluttkontroll&quot;
                    </li>
                    <li>
                      &quot;Lærling jobbet alene i tavle uten skiltet
                      arbeidsoppsyn&quot;
                    </li>
                    <li>
                      &quot;Manglet dokumentasjon for tester på samsvarserklæring
                      ved overlevering&quot;
                    </li>
                  </ul>
                </div>
              )}

              {draft && <DraftCard draft={draft} />}

              {error && (
                <div className="text-sm text-red bg-red/10 border border-red/30 rounded-md px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="border-t border-border p-4 space-y-3">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  draft
                    ? "Hva vil du endre? (f.eks. \"alvorlighet er for høy\")"
                    : "Beskriv hendelsen kort…"
                }
                rows={3}
                className="w-full rounded-md px-3 py-2 text-sm bg-card border border-border focus:border-orange focus:outline-none resize-none"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={onGenerate}
                  disabled={pending || (!description.trim() && !draft)}
                >
                  {pending
                    ? "Genererer…"
                    : draft
                      ? "Oppdater utkast"
                      : "Lag utkast"}
                </Button>
                {draft && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={useDraft}
                      disabled={pending}
                    >
                      Bruk i nytt avvik
                      <ArrowRight className="size-3.5 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={reset}
                      disabled={pending}
                    >
                      Start på nytt
                    </Button>
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function DraftCard({ draft }: { draft: AvvikDraft }) {
  return (
    <div className="bg-card border border-border rounded-md p-4 space-y-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-text-1">{draft.title}</h3>
        <SeverityChip severity={draft.severity} />
      </div>
      <div className="text-xs text-text-3 italic">{draft.summary}</div>
      <Section label="Beskrivelse">{draft.description}</Section>
      <Section label="Alvorlighet — begrunnelse">
        {draft.severity_rationale}
      </Section>
      <Section label="Rotårsak">
        <span className="text-text-3">
          {humanizeCategory(draft.root_cause_category)} ·{" "}
        </span>
        {draft.root_cause_description}
      </Section>
      <Section label="Umiddelbart tiltak (containment)">
        {draft.containment_action}
      </Section>
      <Section label="Korrigerende tiltak">{draft.corrective_action}</Section>
      {draft.clarifying_questions.length > 0 && (
        <div className="border-t border-border pt-3">
          <div className="text-xs uppercase tracking-wider text-orange mb-1">
            AI har spørsmål
          </div>
          <ul className="text-xs text-text-2 space-y-1 list-disc list-inside">
            {draft.clarifying_questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-text-3 mb-0.5">
        {label}
      </div>
      <div className="text-text-1 whitespace-pre-wrap">{children}</div>
    </div>
  );
}

function SeverityChip({ severity }: { severity: AvvikDraft["severity"] }) {
  const map = {
    lav: { label: "Lav", classes: "bg-card-hover text-text-2 border-border" },
    middels: { label: "Middels", classes: "bg-yellow/15 text-yellow border-yellow/40" },
    hoey: { label: "Høy", classes: "bg-orange/15 text-orange border-orange/40" },
    kritisk: { label: "Kritisk", classes: "bg-red/15 text-red border-red/40" },
  };
  const m = map[severity];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${m.classes}`}
    >
      {m.label}
    </span>
  );
}

function humanizeCategory(cat: string): string {
  return (
    {
      menneskelig_feil: "Menneskelig feil",
      manglende_opplaering: "Manglende opplæring",
      utilstrekkelig_prosedyre: "Utilstrekkelig prosedyre",
      materiell_svikt: "Materiell svikt",
      feil_verktoey: "Feil verktøy/utstyr",
      miljoe_forhold: "Miljø/forhold",
      kommunikasjon: "Kommunikasjonssvikt",
      leverandoer: "Leverandør",
      design_feil: "Designfeil",
      annet: "Annet",
    }[cat] ?? cat
  );
}
