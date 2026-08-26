"use client";

import { useState, useTransition, useId, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  importPath,
  classifyFile,
  commitImports,
} from "./actions";

type Kind =
  | "rutine"
  | "skjema_mal"
  | "handbok"
  | "stoffkartotek"
  | "kompetanse"
  | "ukjent";

interface Question {
  id: string;
  question: string;
  options?: string[];
}

interface ItemState {
  localId: string;
  filename: string;
  path: string | null;
  status:
    | "uploading"
    | "classifying"
    | "needs_input"
    | "ready"
    | "committing"
    | "done"
    | "error";
  classification: {
    kind: Kind;
    title: string;
    summary: string;
    confidence: number;
    clarifying_questions?: Question[];
    extracted_fields?: Record<string, string>;
  } | null;
  answers: Record<string, string>;
  commitResult?: { ok: boolean; error?: string; target?: string };
  uiError?: string;
}

const KIND_LABELS: Record<Kind, string> = {
  rutine: "Rutine",
  skjema_mal: "Skjema-mal",
  handbok: "Håndbok-kapittel",
  stoffkartotek: "Stoffkartotek",
  kompetanse: "Kompetansebevis",
  ukjent: "Ukjent",
};

export function ImportWizard() {
  const router = useRouter();
  const fileInputId = useId();
  const sessionId = useRef(crypto.randomUUID()).current;
  const [items, setItems] = useState<ItemState[]>([]);
  const [pending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  // Sjekk AI-helse før brukeren rekker å laste opp — unngår at feilen først
  // vises etter at hun har fylt ut et helt skjema (I-26).
  const [aiHealthy, setAiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health/ai")
      .then((r) => r.json())
      .then((d: { ok: boolean }) => {
        if (!cancelled) setAiHealthy(d.ok);
      })
      .catch(() => {
        if (!cancelled) setAiHealthy(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function patchItem(id: string, patch: Partial<ItemState>) {
    setItems((curr) =>
      curr.map((it) => (it.localId === id ? { ...it, ...patch } : it)),
    );
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setGlobalError(null);
    const supabase = createBrowserClient();

    for (const file of Array.from(files)) {
      const localId = crypto.randomUUID();
      const item: ItemState = {
        localId,
        filename: file.name,
        path: null,
        status: "uploading",
        classification: null,
        answers: {},
      };
      setItems((curr) => [...curr, item]);

      // Hent path fra server (validerer org_id)
      const pathRes = await importPath({
        session_id: sessionId,
        filename: file.name,
      });
      if (pathRes.error || !pathRes.path) {
        patchItem(localId, {
          status: "error",
          uiError: pathRes.error ?? "Klarte ikke beregne sti.",
        });
        continue;
      }
      const path = pathRes.path;

      // Last opp direkte til Supabase
      const { error: upErr } = await supabase.storage
        .from("org-imports")
        .upload(path, file, {
          contentType: file.type || "application/pdf",
          upsert: false,
        });
      if (upErr) {
        patchItem(localId, { status: "error", uiError: upErr.message });
        continue;
      }
      patchItem(localId, { path, status: "classifying" });

      // Klassifiser
      const cls = await classifyFile({ path });
      if (cls.error || !cls.result) {
        patchItem(localId, {
          status: "error",
          uiError: cls.error ?? "Klassifisering feilet.",
        });
        continue;
      }
      const r = cls.result;
      const needsInput =
        r.confidence < 0.7 ||
        (r.clarifying_questions && r.clarifying_questions.length > 0);
      patchItem(localId, {
        classification: r,
        status: needsInput ? "needs_input" : "ready",
      });
    }
  }

  function setAnswer(id: string, qId: string, value: string) {
    setItems((curr) =>
      curr.map((it) =>
        it.localId === id
          ? { ...it, answers: { ...it.answers, [qId]: value } }
          : it,
      ),
    );
  }

  async function refineItem(it: ItemState) {
    if (!it.path) return;
    patchItem(it.localId, { status: "classifying" });
    const userClarifications = Object.entries(it.answers).map(
      ([id, answer]) => ({ id, answer }),
    );
    const cls = await classifyFile({
      path: it.path,
      userClarifications,
    });
    if (cls.error || !cls.result) {
      patchItem(it.localId, {
        status: "needs_input",
        uiError: cls.error ?? "Klassifisering feilet.",
      });
      return;
    }
    patchItem(it.localId, {
      classification: cls.result,
      status: "ready",
      uiError: undefined,
    });
  }

  function manualSetKind(id: string, kind: Kind) {
    setItems((curr) =>
      curr.map((it) =>
        it.localId === id
          ? {
              ...it,
              status: "ready",
              classification: it.classification
                ? { ...it.classification, kind }
                : null,
            }
          : it,
      ),
    );
  }

  function editTitle(id: string, title: string) {
    setItems((curr) =>
      curr.map((it) =>
        it.localId === id
          ? {
              ...it,
              classification: it.classification
                ? { ...it.classification, title }
                : null,
            }
          : it,
      ),
    );
  }

  function onCommit() {
    setGlobalError(null);
    const ready = items.filter(
      (it) =>
        it.status === "ready" &&
        it.classification &&
        it.classification.kind !== "ukjent",
    );
    if (ready.length === 0) {
      setGlobalError("Ingen filer klar for import.");
      return;
    }
    ready.forEach((it) => patchItem(it.localId, { status: "committing" }));
    startTransition(async () => {
      const res = await commitImports({
        items: ready.map((it) => ({
          path: it.path!,
          kind: it.classification!.kind,
          title: it.classification!.title,
          summary: it.classification!.summary,
          extracted_fields: it.classification!.extracted_fields,
        })),
      });
      if (res.error) {
        setGlobalError(res.error);
        ready.forEach((it) => patchItem(it.localId, { status: "ready" }));
        return;
      }
      for (const r of res.results) {
        const it = ready.find((i) => i.path === r.path);
        if (!it) continue;
        patchItem(it.localId, {
          status: r.ok ? "done" : "error",
          commitResult: r,
          uiError: r.error,
        });
      }
      router.refresh();
    });
  }

  const anyReady = items.some(
    (it) =>
      it.status === "ready" &&
      it.classification &&
      it.classification.kind !== "ukjent",
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          {aiHealthy === false ? (
            <div className="border-2 border-dashed border-border rounded-md p-8 text-center text-text-3">
              <AlertCircle className="size-6 mx-auto mb-2" />
              <div className="text-sm font-medium text-text-1">
                AI-tjenesten er utilgjengelig akkurat nå
              </div>
              <div className="text-xs mt-1">
                Prøv igjen om litt, eller registrer dokumentet manuelt.
              </div>
            </div>
          ) : (
            <label
              htmlFor={fileInputId}
              className="block border-2 border-dashed border-border rounded-md p-8 text-center cursor-pointer hover:bg-card-hover transition-colors"
            >
              <Upload className="size-6 mx-auto text-text-3 mb-2" />
              <div className="text-sm font-medium text-text-1">
                Last opp PDF-er
              </div>
              <div className="text-xs text-text-3 mt-1">
                Du kan velge flere filer samtidig. Andre formater må konverteres
                til PDF først.
              </div>
              <input
                id={fileInputId}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => onFilesSelected(e.target.files)}
              />
            </label>
          )}
        </CardBody>
      </Card>

      {globalError && (
        <div className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
          {globalError}
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((it) => (
            <Card key={it.localId}>
              <CardBody className="space-y-3">
                <div className="flex items-start gap-3">
                  <StatusIcon status={it.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-1 truncate">
                      {it.filename}
                    </div>
                    <div className="text-xs text-text-3">
                      {labelForStatus(it.status)}
                      {it.classification &&
                        ` · ${KIND_LABELS[it.classification.kind]} (${Math.round(
                          it.classification.confidence * 100,
                        )}%)`}
                    </div>
                  </div>
                </div>

                {it.uiError && (
                  <div className="text-sm text-red">{it.uiError}</div>
                )}

                {it.status === "needs_input" &&
                  it.classification?.clarifying_questions &&
                  it.classification.clarifying_questions.length > 0 && (
                    <div className="border-t border-border pt-3 space-y-3">
                      <div className="text-xs text-text-2 italic">
                        {it.classification.summary}
                      </div>
                      {it.classification.clarifying_questions.map((q) => (
                        <Field key={q.id} label={q.question}>
                          {q.options && q.options.length > 0 ? (
                            <select
                              value={it.answers[q.id] ?? ""}
                              onChange={(e) =>
                                setAnswer(it.localId, q.id, e.target.value)
                              }
                              className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
                            >
                              <option value="">— Velg —</option>
                              {q.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={it.answers[q.id] ?? ""}
                              onChange={(e) =>
                                setAnswer(it.localId, q.id, e.target.value)
                              }
                            />
                          )}
                        </Field>
                      ))}
                      <Button size="sm" onClick={() => refineItem(it)}>
                        Klassifiser på nytt
                      </Button>
                    </div>
                  )}

                {(it.status === "ready" || it.status === "needs_input") &&
                  it.classification && (
                    <div className="border-t border-border pt-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Tittel">
                          <Input
                            value={it.classification.title}
                            onChange={(e) =>
                              editTitle(it.localId, e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Type">
                          <select
                            value={it.classification.kind}
                            onChange={(e) =>
                              manualSetKind(it.localId, e.target.value as Kind)
                            }
                            className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
                          >
                            {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
                              <option key={k} value={k}>
                                {KIND_LABELS[k]}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      {it.classification.summary && (
                        <Field label="Sammendrag">
                          <Textarea
                            value={it.classification.summary}
                            onChange={(e) =>
                              setItems((curr) =>
                                curr.map((x) =>
                                  x.localId === it.localId &&
                                  x.classification
                                    ? {
                                        ...x,
                                        classification: {
                                          ...x.classification,
                                          summary: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                            rows={2}
                          />
                        </Field>
                      )}
                    </div>
                  )}
              </CardBody>
            </Card>
          ))}

          {anyReady && (
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={onCommit} disabled={pending}>
                {pending ? "Importerer…" : "Importer valgte filer"}
              </Button>
              <span className="text-xs text-text-3">
                Hopper over filer med status &quot;ukjent&quot;.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: ItemState["status"] }) {
  if (status === "done") return <CheckCircle2 className="size-5 text-green" />;
  if (status === "error") return <AlertCircle className="size-5 text-red" />;
  if (
    status === "uploading" ||
    status === "classifying" ||
    status === "committing"
  )
    return <Loader2 className="size-5 text-orange animate-spin" />;
  return <Upload className="size-5 text-text-3" />;
}

function labelForStatus(s: ItemState["status"]): string {
  return {
    uploading: "Laster opp…",
    classifying: "Klassifiserer…",
    needs_input: "Trenger flere opplysninger",
    ready: "Klar for import",
    committing: "Importerer…",
    done: "Importert",
    error: "Feil",
  }[s];
}
