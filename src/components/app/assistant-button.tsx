"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  AlertTriangle,
  ArrowRight,
  AlertCircle,
  HardHat,
  BookOpen,
  Send,
  Rocket,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  askAvvikAssistant,
  askSjaAssistant,
  askIsoVeileder,
  askOnboarding,
} from "@/app/(app)/actions/assistant";
import type { AvvikDraft } from "@/lib/ai/skills/avvik";
import type { SjaDraft } from "@/lib/ai/skills/sja";
import type { IsoMessage } from "@/lib/ai/skills/iso";
import type {
  OnboardingMessage,
  OnboardingProgress,
} from "@/lib/ai/skills/onboarding";
import { MarkdownMini } from "@/components/app/markdown-mini";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

type Skill = "onboarding" | "avvik" | "sja" | "iso";

const AVVIK_DRAFT_KEY = "echoo:avvik_draft";

export function AssistantButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const [skill, setSkill] = useState<Skill>("onboarding");
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Per-skill state — bevares når man bytter tab
  const [avvikDraft, setAvvikDraft] = useState<AvvikDraft | null>(null);
  const [sjaDraft, setSjaDraft] = useState<SjaDraft | null>(null);
  const [isoMessages, setIsoMessages] = useState<IsoMessage[]>([]);
  const [onboardingMessages, setOnboardingMessages] = useState<OnboardingMessage[]>([]);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress | null>(null);
  const isoBottomRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(panelRef, open);
  const onboardingBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (skill === "iso") {
      isoBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (skill === "onboarding") {
      onboardingBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isoMessages, onboardingMessages, skill]);

  function onSubmit() {
    setError(null);
    const text = input.trim();
    if (!text && !(skill === "avvik" && avvikDraft) && !(skill === "sja" && sjaDraft)) {
      return;
    }

    startTransition(async () => {
      if (skill === "avvik") {
        const res = await askAvvikAssistant({
          description: text,
          previousDraft: avvikDraft ?? undefined,
          userFeedback: avvikDraft ? text : undefined,
        });
        if (res.error || !res.draft) {
          setError(res.error ?? "Klarte ikke generere utkast.");
          return;
        }
        setAvvikDraft(res.draft);
        setInput("");
      } else if (skill === "sja") {
        const res = await askSjaAssistant({
          description: text,
          previousDraft: sjaDraft ?? undefined,
          userFeedback: sjaDraft ? text : undefined,
        });
        if (res.error || !res.draft) {
          setError(res.error ?? "Klarte ikke generere SJA.");
          return;
        }
        setSjaDraft(res.draft);
        setInput("");
      } else if (skill === "iso") {
        if (!text) return;
        const newMessages: IsoMessage[] = [
          ...isoMessages,
          { role: "user", content: text },
        ];
        setIsoMessages(newMessages);
        setInput("");
        const res = await askIsoVeileder({ messages: newMessages });
        if (res.error || !res.reply) {
          setError(res.error ?? "Klarte ikke svare.");
          return;
        }
        setIsoMessages([
          ...newMessages,
          { role: "assistant", content: res.reply },
        ]);
      } else {
        // onboarding
        if (!text && onboardingMessages.length > 0) return;
        const userMsg: OnboardingMessage = {
          role: "user",
          content: text || "Hjelp meg komme i gang.",
        };
        const newMessages: OnboardingMessage[] = [
          ...onboardingMessages,
          userMsg,
        ];
        setOnboardingMessages(newMessages);
        setInput("");
        const res = await askOnboarding({ messages: newMessages });
        if (res.error || !res.reply) {
          setError(res.error ?? "Klarte ikke svare.");
          return;
        }
        if (res.progress) setOnboardingProgress(res.progress);
        setOnboardingMessages([
          ...newMessages,
          { role: "assistant", content: res.reply },
        ]);
      }
    });
  }

  function useAvvikDraft() {
    if (!avvikDraft) return;
    try {
      localStorage.setItem(AVVIK_DRAFT_KEY, JSON.stringify(avvikDraft));
    } catch {
      // ignore
    }
    setOpen(false);
    router.push("/avvik/ny?from_ai=1");
  }

  function resetCurrent() {
    setError(null);
    setInput("");
    if (skill === "avvik") setAvvikDraft(null);
    else if (skill === "sja") setSjaDraft(null);
    else if (skill === "iso") setIsoMessages([]);
    else if (skill === "onboarding") {
      setOnboardingMessages([]);
      setOnboardingProgress(null);
    }
  }

  const placeholder = (() => {
    if (skill === "avvik") {
      return avvikDraft
        ? 'Hva vil du endre? (f.eks. "alvorlighet er for høy")'
        : "Beskriv hendelsen kort…";
    }
    if (skill === "sja") {
      return sjaDraft
        ? "Hva vil du justere? (f.eks. \"legg til at det er trangt arbeidsrom\")"
        : "Beskriv jobben: hva, hvor, energistatus…";
    }
    if (skill === "iso") {
      return "Spør ISO-veilederen… (f.eks. \"hva kreves for ledelsens gjennomgang?\")";
    }
    return onboardingMessages.length === 0
      ? "Start her, eller skriv litt om bransjen din…"
      : "Skriv tilbake…";
  })();

  const submitLabel = (() => {
    if (pending) return skill === "avvik" || skill === "sja" ? "Genererer…" : "Sender…";
    if (skill === "avvik") return avvikDraft ? "Oppdater utkast" : "Lag utkast";
    if (skill === "sja") return sjaDraft ? "Oppdater SJA" : "Lag SJA-utkast";
    return "Send";
  })();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="AI-assistent"
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-orange/20 text-orange border border-orange/40 px-4 py-2.5 text-sm font-semibold shadow-lg hover:bg-orange/30 transition-colors"
      >
        <Sparkles className="size-4" />
        <span className="hidden sm:inline">AI-assistent</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={() => setOpen(false)}
        >
          <aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Echoo AI-assistent"
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
                onClick={() => setOpen(false)}
                className="text-text-3 hover:text-text-1"
                aria-label="Lukk"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex border-b border-border">
              <SkillTab
                active={skill === "onboarding"}
                onClick={() => setSkill("onboarding")}
                icon={<Rocket className="size-3.5" />}
                label="Kom-i-gang"
              />
              <SkillTab
                active={skill === "avvik"}
                onClick={() => setSkill("avvik")}
                icon={<AlertTriangle className="size-3.5" />}
                label="Avvik"
              />
              <SkillTab
                active={skill === "sja"}
                onClick={() => setSkill("sja")}
                icon={<HardHat className="size-3.5" />}
                label="SJA"
              />
              <SkillTab
                active={skill === "iso"}
                onClick={() => setSkill("iso")}
                icon={<BookOpen className="size-3.5" />}
                label="ISO-veileder"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {skill === "onboarding" && (
                <OnboardingContent
                  messages={onboardingMessages}
                  progress={onboardingProgress}
                  pending={pending}
                  bottomRef={onboardingBottomRef}
                />
              )}
              {skill === "avvik" && <AvvikContent draft={avvikDraft} />}
              {skill === "sja" && <SjaContent draft={sjaDraft} />}
              {skill === "iso" && (
                <IsoContent
                  messages={isoMessages}
                  pending={pending}
                  bottomRef={isoBottomRef}
                />
              )}

              {error && (
                <div className="text-sm text-red bg-red/10 border border-red/30 rounded-md px-3 py-2 flex items-start gap-2">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="border-t border-border p-4 space-y-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
                placeholder={placeholder}
                rows={skill === "iso" ? 2 : 3}
                className="w-full rounded-md px-3 py-2 text-sm bg-card border border-border focus:border-orange focus:outline-none resize-none"
              />
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  size="sm"
                  onClick={onSubmit}
                  disabled={
                    pending ||
                    (!input.trim() &&
                      !(skill === "avvik" && avvikDraft) &&
                      !(skill === "sja" && sjaDraft))
                  }
                >
                  {skill === "iso" && <Send className="size-3.5 mr-1" />}
                  {submitLabel}
                </Button>
                {skill === "avvik" && avvikDraft && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={useAvvikDraft}
                    disabled={pending}
                  >
                    Bruk i nytt avvik
                    <ArrowRight className="size-3.5 ml-1" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetCurrent}
                  disabled={pending}
                >
                  Start på nytt
                </Button>
                <span className="text-[10px] text-text-3 ml-auto">⌘+Enter</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function SkillTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors flex items-center justify-center gap-1.5 ${
        active
          ? "border-orange text-orange"
          : "border-transparent text-text-3 hover:text-text-1"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ============================================================
   Avvik
   ============================================================ */

function AvvikContent({ draft }: { draft: AvvikDraft | null }) {
  if (!draft) {
    return (
      <div className="text-sm text-text-2 space-y-2">
        <p>
          <strong>Eksempler:</strong>
        </p>
        <ul className="text-text-3 text-xs space-y-1.5 list-disc list-inside">
          <li>
            &quot;Glemte å koble jordleder før spenning på, oppdaget under
            sluttkontroll&quot;
          </li>
          <li>
            &quot;Lærling jobbet alene i tavle uten skiltet arbeidsoppsyn&quot;
          </li>
        </ul>
      </div>
    );
  }

  const map = {
    lav: "bg-card-hover text-text-2 border-border",
    middels: "bg-yellow/15 text-yellow border-yellow/40",
    hoey: "bg-orange/15 text-orange border-orange/40",
    kritisk: "bg-red/15 text-red border-red/40",
  } as const;
  const label = {
    lav: "Lav",
    middels: "Middels",
    hoey: "Høy",
    kritisk: "Kritisk",
  } as const;

  return (
    <div className="bg-card border border-border rounded-md p-4 space-y-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-text-1">{draft.title}</h3>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[draft.severity]}`}
        >
          {label[draft.severity]}
        </span>
      </div>
      <div className="text-xs text-text-3 italic">{draft.summary}</div>
      <Section label="Beskrivelse">{draft.description}</Section>
      <Section label="Alvorlighet — begrunnelse">
        {draft.severity_rationale}
      </Section>
      <Section label="Rotårsak">
        <span className="text-text-3">{draft.root_cause_category}</span>
        {" — "}
        {draft.root_cause_description}
      </Section>
      <Section label="Umiddelbart tiltak (containment)">
        {draft.containment_action}
      </Section>
      <Section label="Korrigerende tiltak">{draft.corrective_action}</Section>
      {draft.clarifying_questions.length > 0 && (
        <ClarifyingQuestions list={draft.clarifying_questions} />
      )}
    </div>
  );
}

/* ============================================================
   SJA
   ============================================================ */

function SjaContent({ draft }: { draft: SjaDraft | null }) {
  if (!draft) {
    return (
      <div className="text-sm text-text-2 space-y-2">
        <p>
          <strong>Eksempler:</strong>
        </p>
        <ul className="text-text-3 text-xs space-y-1.5 list-disc list-inside">
          <li>
            &quot;Skal koble om i hovedfordeling i 2. etg, kunden vil ikke ha
            avbrudd, anlegget er energiert&quot;
          </li>
          <li>
            &quot;Montering av nye armaturer i 4m takhøyde, krever
            personløfter&quot;
          </li>
          <li>
            &quot;Kabling i kabelkulvert under bakken, kjente kjemikalier i
            området&quot;
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-md p-4 space-y-3 text-sm">
      <div>
        <div className="font-semibold text-text-1 mb-1">Jobben</div>
        <p className="text-text-2">{draft.job_description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-text-3 uppercase tracking-wider mb-0.5">
            Lokasjon
          </div>
          <div className="text-text-1 capitalize">
            {draft.location_type.replace("_", " ")}
          </div>
        </div>
        <div>
          <div className="text-text-3 uppercase tracking-wider mb-0.5">
            Energistatus
          </div>
          <div className="text-text-1 capitalize">
            {draft.energy_state.replace("_", " ")}
          </div>
        </div>
      </div>

      <Section label="Kompetanse-krav">{draft.competence_required}</Section>

      <div>
        <div className="text-xs uppercase tracking-wider text-text-3 mb-2">
          Farer ({draft.hazards.length})
        </div>
        <div className="space-y-2">
          {draft.hazards.map((h, i) => (
            <HazardCard key={i} hazard={h} />
          ))}
        </div>
      </div>

      {draft.general_ppe.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-text-3 mb-1">
            Baseline verneutstyr
          </div>
          <div className="flex flex-wrap gap-1">
            {draft.general_ppe.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md bg-card-hover text-text-1 border border-border px-2 py-0.5 text-xs"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {draft.fse_notes && (
        <Section label="FSE/FEL/NEK 400-momenter">{draft.fse_notes}</Section>
      )}

      {draft.clarifying_questions.length > 0 && (
        <ClarifyingQuestions list={draft.clarifying_questions} />
      )}
    </div>
  );
}

function HazardCard({ hazard }: { hazard: SjaDraft["hazards"][number] }) {
  const score = hazard.risk_score;
  const tone =
    score >= 16
      ? "bg-red/15 text-red border-red/40"
      : score >= 9
        ? "bg-orange/15 text-orange border-orange/40"
        : score >= 4
          ? "bg-yellow/15 text-yellow border-yellow/40"
          : "bg-card-hover text-text-2 border-border";
  return (
    <div className="border border-border rounded-md p-2.5 space-y-1.5 bg-surface">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-text-1 text-sm">{hazard.name}</div>
          <div className="text-[11px] text-text-3 capitalize">
            {hazard.category}
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}
        >
          Risiko {score}
        </span>
      </div>
      <p className="text-xs text-text-2 italic">{hazard.rationale}</p>
      <div className="text-xs text-text-1">
        <span className="text-text-3">Tiltak: </span>
        {hazard.controls}
      </div>
      {hazard.ppe.length > 0 && (
        <div className="text-xs text-text-3">
          Verneutstyr: {hazard.ppe.join(", ")}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ISO-veileder
   ============================================================ */

function IsoContent({
  messages,
  pending,
  bottomRef,
}: {
  messages: IsoMessage[];
  pending: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (messages.length === 0) {
    return (
      <div className="text-sm text-text-2 space-y-2">
        <p>
          <strong>Spør om ISO 9001 / 14001 — eksempler:</strong>
        </p>
        <ul className="text-text-3 text-xs space-y-1.5 list-disc list-inside">
          <li>&quot;Hvor ofte må vi ha ledelsens gjennomgang?&quot;</li>
          <li>
            &quot;Hva er forskjellen på korrigerende og forebyggende
            tiltak?&quot;
          </li>
          <li>&quot;Hvilke miljøaspekter må en elektrobedrift kartlegge?&quot;</li>
          <li>&quot;Hva må jeg ha klar før vi blir sertifisert?&quot;</li>
        </ul>
        <p className="text-xs text-text-3 mt-3">
          Veilederen peker deg til Echoo-modulene som dekker temaet — den
          erstatter ikke en sertifiseringskonsulent.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m, i) => (
        <MessageBubble key={i} message={m} />
      ))}
      {pending && (
        <div className="text-xs text-text-3 italic flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-orange animate-pulse" />
          ISO-veilederen tenker…
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: IsoMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-orange/15 text-orange rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] text-sm">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3 py-2 max-w-[90%] text-text-1">
        <MarkdownMini text={message.content} />
      </div>
    </div>
  );
}

/* ============================================================
   Shared bits
   ============================================================ */

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-text-3 mb-0.5">
        {label}
      </div>
      <div className="text-text-1 whitespace-pre-wrap">{children}</div>
    </div>
  );
}

function ClarifyingQuestions({ list }: { list: string[] }) {
  return (
    <div className="border-t border-border pt-3">
      <div className="text-xs uppercase tracking-wider text-orange mb-1">
        AI har spørsmål
      </div>
      <ul className="text-xs text-text-2 space-y-1 list-disc list-inside">
        {list.map((q, i) => (
          <li key={i}>{q}</li>
        ))}
      </ul>
    </div>
  );
}

const ONBOARDING_STEPS_UI: { id: string; label: string }[] = [
  { id: "kunde", label: "Opprett din første kunde" },
  { id: "prosjekt", label: "Opprett ditt første prosjekt" },
  { id: "team", label: "Inviter en kollega" },
  { id: "kompetanse", label: "Last opp et kursbevis" },
  { id: "rutine", label: "Aktiver HMS-rutiner" },
  { id: "dokument", label: "Lag første dokument-utkast" },
];

function OnboardingContent({
  messages,
  progress,
  pending,
  bottomRef,
}: {
  messages: OnboardingMessage[];
  progress: OnboardingProgress | null;
  pending: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  const completed = progress?.completed_steps ?? [];
  const doneCount = completed.length;
  const totalCount = ONBOARDING_STEPS_UI.length;
  return (
    <div className="space-y-4">
      {/* Progress-bar med stegene */}
      <div className="border border-border rounded-md p-3 bg-card/50 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-text-1">Din fremgang</span>
          <span className="text-text-3">
            {doneCount} / {totalCount} fullført
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-card overflow-hidden">
          <div
            className="h-full bg-orange transition-all"
            style={{ width: `${(doneCount / totalCount) * 100}%` }}
          />
        </div>
        <ul className="text-xs space-y-0.5 mt-2">
          {ONBOARDING_STEPS_UI.map((s) => {
            const done = completed.includes(s.id as never);
            return (
              <li
                key={s.id}
                className={`flex items-center gap-1.5 ${done ? "text-text-3 line-through" : "text-text-2"}`}
              >
                {done ? (
                  <CheckCircle2 className="size-3 text-green shrink-0" />
                ) : (
                  <span className="size-3 rounded-full border border-text-3 shrink-0" />
                )}
                <span className="truncate">{s.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {messages.length === 0 ? (
        <div className="text-sm text-text-2 space-y-2">
          <p>
            <strong>Velkommen til Echoo</strong> 👋
          </p>
          <p>
            Jeg er din kom-i-gang-veileder. Trykk Send for å starte, eller
            skriv litt om bedriften din først — bransje, antall ansatte,
            hva som er viktigst å få på plass. Jeg foreslår steg etter steg
            tilpasset deg.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          {pending && (
            <div className="text-xs text-text-3 italic flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-orange animate-pulse" />
              Tenker…
            </div>
          )}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
