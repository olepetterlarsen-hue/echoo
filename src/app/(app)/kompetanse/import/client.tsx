"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
} from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  certImportPath,
  classifyCertPdf,
  commitCertImports,
} from "./actions";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}
interface RequiredCourse {
  id: string;
  name: string;
}

type Status =
  | "uploading"
  | "extracting"
  | "ready"
  | "committing"
  | "done"
  | "error";

interface Item {
  localId: string;
  filename: string;
  path: string | null;
  status: Status;
  extracted: {
    course_name: string;
    person_name: string;
    issuer: string;
    issued_date: string;
    expires_date: string;
    confidence: number;
  } | null;
  profile_id: string;
  required_course_id: string;
  error?: string;
}

export function CertImportClient({
  profiles,
  courses,
}: {
  profiles: Profile[];
  courses: RequiredCourse[];
}) {
  const router = useRouter();
  const sessionId = useRef(crypto.randomUUID()).current;
  const [items, setItems] = useState<Item[]>([]);
  const [pending, startTransition] = useTransition();
  const [globalMsg, setGlobalMsg] = useState<string | null>(null);

  function patchItem(id: string, p: Partial<Item>) {
    setItems((curr) =>
      curr.map((it) => (it.localId === id ? { ...it, ...p } : it)),
    );
  }

  function fuzzyMatch(needle: string, options: { id: string; name: string }[]) {
    if (!needle) return "";
    const n = needle.toLowerCase();
    // Eksakt substring først
    for (const o of options) {
      if (o.name.toLowerCase().includes(n) || n.includes(o.name.toLowerCase())) {
        return o.id;
      }
    }
    // Token-overlap
    const nTokens = n.split(/\s+/).filter((t) => t.length > 2);
    let best = "";
    let bestScore = 0;
    for (const o of options) {
      const oTokens = o.name.toLowerCase().split(/\s+/);
      const score = nTokens.filter((t) =>
        oTokens.some((ot) => ot.includes(t) || t.includes(ot)),
      ).length;
      if (score > bestScore) {
        bestScore = score;
        best = o.id;
      }
    }
    return best;
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setGlobalMsg(null);
    const supabase = createBrowserClient();

    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf") {
        setGlobalMsg("Bare PDF-filer støttes.");
        continue;
      }
      const localId = crypto.randomUUID();
      const item: Item = {
        localId,
        filename: file.name,
        path: null,
        status: "uploading",
        extracted: null,
        profile_id: "",
        required_course_id: "",
      };
      setItems((curr) => [...curr, item]);

      const pathRes = await certImportPath({
        session_id: sessionId,
        filename: file.name,
      });
      if (pathRes.error || !pathRes.path) {
        patchItem(localId, { status: "error", error: pathRes.error });
        continue;
      }

      const { error: upErr } = await supabase.storage
        .from("org-imports")
        .upload(pathRes.path, file, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (upErr) {
        patchItem(localId, { status: "error", error: upErr.message });
        continue;
      }
      patchItem(localId, { path: pathRes.path, status: "extracting" });

      const cls = await classifyCertPdf({ path: pathRes.path });
      if (cls.error || !cls.extracted) {
        patchItem(localId, {
          status: "error",
          error: cls.error,
          path: pathRes.path,
        });
        continue;
      }

      const profileGuess = fuzzyMatch(
        cls.extracted.person_name,
        profiles.map((p) => ({ id: p.id, name: p.full_name ?? p.email })),
      );
      const courseGuess = fuzzyMatch(cls.extracted.course_name, courses);

      patchItem(localId, {
        extracted: cls.extracted,
        profile_id: profileGuess,
        required_course_id: courseGuess,
        status: "ready",
      });
    }
  }

  function commit() {
    setGlobalMsg(null);
    const ready = items.filter(
      (it) => it.status === "ready" && it.extracted && it.path && it.profile_id,
    );
    if (ready.length === 0) {
      setGlobalMsg(
        "Ingen filer klare. Hvert kursbevis må ha en valgt ansatt før import.",
      );
      return;
    }
    ready.forEach((it) => patchItem(it.localId, { status: "committing" }));
    startTransition(async () => {
      const res = await commitCertImports({
        items: ready.map((it) => ({
          source_path: it.path!,
          filename: it.filename,
          profile_id: it.profile_id,
          required_course_id: it.required_course_id || null,
          name: it.extracted!.course_name,
          issuer: it.extracted!.issuer,
          issued_date: it.extracted!.issued_date,
          expires_date: it.extracted!.expires_date,
        })),
      });
      ready.forEach((it) => {
        const failed = res.errors?.find((e) => e.filename === it.filename);
        patchItem(it.localId, {
          status: failed ? "error" : "done",
          error: failed?.error,
        });
      });
      if (res.inserted && res.inserted > 0) {
        setGlobalMsg(`Importerte ${res.inserted} kursbevis.`);
        setTimeout(() => {
          router.push("/kompetanse/matrise");
          router.refresh();
        }, 1500);
      }
    });
  }

  function removeItem(id: string) {
    setItems((curr) => curr.filter((it) => it.localId !== id));
  }

  const readyCount = items.filter(
    (it) => it.status === "ready" && it.profile_id,
  ).length;
  const needProfileCount = items.filter(
    (it) => it.status === "ready" && !it.profile_id,
  ).length;

  return (
    <Card>
      <CardBody className="space-y-4">
        {profiles.length === 0 && (
          <div className="bg-yellow/10 border border-yellow/30 rounded-md px-3 py-2 text-sm text-yellow">
            Ingen ansatte registrert. Inviter dem under{" "}
            <Link
              href="/admin/brukere"
              className="underline"
            >
              /admin/brukere
            </Link>
            {" "}før du importerer kursbevis.
          </div>
        )}
        {courses.length === 0 && (
          <div className="bg-yellow/10 border border-yellow/30 rounded-md px-3 py-2 text-sm text-yellow">
            Ingen påkrevde kurs definert. Definer dem under{" "}
            <Link
              href="/kompetanse/kurs-krav"
              className="underline"
            >
              Påkrevde kurs
            </Link>
            {" "}for at AI skal kunne koble bevis riktig.
          </div>
        )}

        <label className="block border-2 border-dashed border-border rounded-md p-8 text-center cursor-pointer hover:bg-card-hover transition-colors">
          <Upload className="size-6 mx-auto text-text-3 mb-2" />
          <div className="text-sm font-medium text-text-1">
            Last opp kursbevis-PDFer
          </div>
          <div className="text-xs text-text-3 mt-1">
            Velg flere filer samtidig. AI matcher mot bedriftens ansatte og
            påkrevde kurs.
          </div>
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>

        {globalMsg && (
          <div className="text-sm bg-orange/10 border border-orange/30 text-orange rounded-md px-3 py-2">
            {globalMsg}
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((it) => (
              <ItemRow
                key={it.localId}
                item={it}
                profiles={profiles}
                courses={courses}
                onPatch={(p) => patchItem(it.localId, p)}
                onRemove={() => removeItem(it.localId)}
              />
            ))}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Button onClick={commit} disabled={pending || readyCount === 0}>
                {pending ? "Importerer…" : `Importer ${readyCount} kursbevis`}
              </Button>
              {needProfileCount > 0 && (
                <span className="text-xs text-yellow">
                  {needProfileCount} mangler ansatt-matching
                </span>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function ItemRow({
  item,
  profiles,
  courses,
  onPatch,
  onRemove,
}: {
  item: Item;
  profiles: Profile[];
  courses: RequiredCourse[];
  onPatch: (p: Partial<Item>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-md p-3 space-y-2">
      <div className="flex items-start gap-2">
        <StatusIcon status={item.status} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-1 truncate">
            {item.filename}
          </div>
          <div className="text-xs text-text-3">
            {labelFor(item.status)}
            {item.extracted &&
              ` · confidence ${Math.round(item.extracted.confidence * 100)}%`}
          </div>
        </div>
        {(item.status === "error" || item.status === "ready") && (
          <button
            onClick={onRemove}
            className="text-text-3 hover:text-red"
            aria-label="Fjern"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      {item.error && <div className="text-xs text-red">{item.error}</div>}
      {item.extracted &&
        item.status !== "uploading" &&
        item.status !== "extracting" && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <Cell label="Ansatt">
                <select
                  value={item.profile_id}
                  onChange={(e) => onPatch({ profile_id: e.target.value })}
                  className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm"
                >
                  <option value="">— Velg —</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name ?? p.email}
                    </option>
                  ))}
                </select>
              </Cell>
              <Cell label="Påkrevet kurs">
                <select
                  value={item.required_course_id}
                  onChange={(e) =>
                    onPatch({ required_course_id: e.target.value })
                  }
                  className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm"
                >
                  <option value="">— Ikke koblet —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Cell>
              <Cell label="Kursnavn (på bevis)">
                <input
                  value={item.extracted.course_name}
                  onChange={(e) =>
                    onPatch({
                      extracted: { ...item.extracted!, course_name: e.target.value },
                    })
                  }
                  className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm"
                />
              </Cell>
              <Cell label="Utsteder">
                <input
                  value={item.extracted.issuer}
                  onChange={(e) =>
                    onPatch({
                      extracted: { ...item.extracted!, issuer: e.target.value },
                    })
                  }
                  className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm"
                />
              </Cell>
              <Cell label="Utstedt">
                <input
                  type="date"
                  value={item.extracted.issued_date}
                  onChange={(e) =>
                    onPatch({
                      extracted: {
                        ...item.extracted!,
                        issued_date: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm"
                />
              </Cell>
              <Cell label="Utløper">
                <input
                  type="date"
                  value={item.extracted.expires_date}
                  onChange={(e) =>
                    onPatch({
                      extracted: {
                        ...item.extracted!,
                        expires_date: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm"
                />
              </Cell>
            </div>
          </div>
        )}
    </div>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] text-text-3 mb-0.5">{label}</div>
      {children}
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "done") return <CheckCircle2 className="size-4 text-green" />;
  if (status === "error") return <AlertCircle className="size-4 text-red" />;
  if (status === "uploading" || status === "extracting" || status === "committing")
    return <Loader2 className="size-4 text-orange animate-spin" />;
  return <FileText className="size-4 text-text-3" />;
}

function labelFor(s: Status): string {
  return {
    uploading: "Laster opp…",
    extracting: "AI ekstraherer…",
    ready: "Klar for import",
    committing: "Importerer…",
    done: "Importert",
    error: "Feil",
  }[s];
}
