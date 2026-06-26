"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Upload, FileDown, AlertCircle, X } from "lucide-react";
import type { Routine } from "@/lib/types/database";
import { downloadRoutine, uploadRoutine } from "./actions";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface Props {
  initial: Routine[];
  isAdmin: boolean;
}

const CATEGORIES = ["FSE", "FEL", "Utstyr", "Dokumentasjon", "Tilkobling", "Stillinger", "Produktsikkerhet"];

export function RoutinesClient({ initial, isAdmin }: Props) {
  const { locale } = useLocale();
  const [routines, setRoutines] = useState(initial);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [language, setLanguage] = useState<"no" | "en">("no");

  const filtered = useMemo(() => {
    let list = routines;
    if (category !== "all") {
      list = list.filter((r) => r.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title_no.toLowerCase().includes(q) ||
          r.title_en.toLowerCase().includes(q) ||
          (r.category ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [routines, search, category]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr("routine_search_placeholder", locale)}
            className="w-full h-10 rounded-md pl-9 pr-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
        >
          <option value="all">{tr("routine_all_categories", locale)}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setLanguage("no")}
            className={`px-3 h-10 text-sm ${language === "no" ? "bg-orange text-bg" : "bg-card hover:bg-card-hover"}`}
          >
            Norsk
          </button>
          <button
            onClick={() => setLanguage("en")}
            className={`px-3 h-10 text-sm ${language === "en" ? "bg-orange text-bg" : "bg-card hover:bg-card-hover"}`}
          >
            English
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardBody className="text-center text-text-3 text-sm">
            {tr("routine_empty", locale)}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <RoutineRow
              key={r.id}
              routine={r}
              language={language}
              isAdmin={isAdmin}
              onUpdated={(updated) =>
                setRoutines((prev) =>
                  prev.map((x) => (x.id === updated.id ? updated : x)),
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RoutineRow({
  routine,
  language,
  isAdmin,
  onUpdated,
}: {
  routine: Routine;
  language: "no" | "en";
  isAdmin: boolean;
  onUpdated: (r: Routine) => void;
}) {
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Inline PDF-viewer state — Erik klaget over at "trykk" tvang nedlasting.
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const title = language === "no" ? routine.title_no : routine.title_en;
  const filePath =
    language === "no"
      ? (routine.file_path_no ?? routine.file_path_en)
      : (routine.file_path_en ?? routine.file_path_no);
  const fallbackLang =
    language === "no" && !routine.file_path_no && routine.file_path_en
      ? tr("routine_only_lang_english", locale)
      : language === "en" && !routine.file_path_en && routine.file_path_no
        ? tr("routine_only_lang_norwegian", locale)
        : null;

  function onOpen() {
    if (!filePath) return;
    setError(null);
    startTransition(async () => {
      const res = await downloadRoutine({ filePath });
      if (res.error) setError(res.error);
      else if (res.url) setViewerUrl(res.url);
    });
  }

  function onUpload(targetLang: "no" | "en") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setError(null);
      startTransition(async () => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("routine_id", String(routine.id));
        formData.append("language", targetLang);
        const res = await uploadRoutine(formData);
        if (res.error) setError(res.error);
        else if (res.routine) onUpdated(res.routine);
      });
    };
    input.click();
  }

  return (
    <Card>
      <CardBody className="flex items-center gap-3 flex-wrap">
        <FileText className="size-5 text-orange shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {routine.number && (
              <span className="text-xs text-text-3 font-mono">
                {routine.number}.
              </span>
            )}
            <span className="font-medium text-text-1">{title}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {routine.category && <Badge tone="neutral">{routine.category}</Badge>}
            {fallbackLang && (
              <span className="text-xs text-yellow flex items-center gap-1">
                <AlertCircle className="size-3" />
                {tr("routine_only_lang_available", locale).replace(
                  "{lang}",
                  fallbackLang,
                )}
              </span>
            )}
            {!filePath && (
              <span className="text-xs text-text-3">
                {tr("routine_not_uploaded", locale)}
              </span>
            )}
          </div>
          {error && <p className="text-xs text-red mt-1">{error}</p>}
        </div>
        <div className="flex gap-2">
          {filePath && (
            <Button
              size="sm"
              onClick={onOpen}
              disabled={pending}
              title={tr("routine_open", locale)}
            >
              <FileText className="size-4" />
              {tr("routine_open", locale)}
            </Button>
          )}
          {isAdmin && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onUpload(language)}
                disabled={pending}
                title={
                  language === "no"
                    ? tr("routine_upload_no_title", locale)
                    : tr("routine_upload_en_title", locale)
                }
              >
                <Upload className="size-4" />
                {language === "no" ? "NO" : "EN"}
              </Button>
            </div>
          )}
        </div>
      </CardBody>
      {viewerUrl && (
        <PdfViewerModal
          url={viewerUrl}
          title={title ?? ""}
          onClose={() => setViewerUrl(null)}
        />
      )}
    </Card>
  );
}

// Modal med iframe-PDF + last-ned-knapp. Erik klaget: "la det være noe man kan
// trykke på så blir bare siden lengre, så kan man lese og velge om man vil
// laste ned eller ikke". Bruker iframe-rendering (alle moderne nettlesere
// støtter PDF inline).
function PdfViewerModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-4xl h-[90vh] bg-surface border border-border rounded-lg shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold truncate flex items-center gap-2">
            <FileText className="size-4 text-orange" />
            {title}
          </h2>
          <div className="flex gap-2 shrink-0">
            <a href={url} download className="inline-flex">
              <Button size="sm" variant="secondary" title={tr("routine_download", locale)}>
                <FileDown className="size-4" />
                {tr("routine_download", locale)}
              </Button>
            </a>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              aria-label={tr("close", locale)}
              title={tr("close", locale)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <iframe
          src={url}
          title={title}
          className="flex-1 w-full bg-bg"
        />
      </div>
    </div>
  );
}
