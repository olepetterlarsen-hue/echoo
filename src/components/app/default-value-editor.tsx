"use client";

// Delt DefaultValueEditor — brukes både i /admin/maler/ny (custom-bygger)
// og /admin/maler/[kind] (kanonisk-bygger inkl. samsvarserklæring).
//
// Kombinerer TokenPalette med et textarea som støtter drag-and-drop av
// $-tokens, klikk-innsetting ved markøren, og live preview som viser
// hvordan tokens erstattes med reell prosjekt- og selskapsdata.

import { useRef, type DragEvent } from "react";
import { TokenPalette, insertAtCursor } from "./token-palette";
import {
  applyTokens,
  hasTokens,
  samplePreviewProject,
  samplePreviewSettings,
} from "@/lib/document-templates/tokens";

interface Props {
  value: string;
  onChange: (value: string | undefined) => void;
  /** Skjul palette+preview og bare vis et vanlig textarea. */
  hideTokens?: boolean;
  /** Antall rader for textarea. Default 2. */
  rows?: number;
  /** Placeholder i textarea. */
  placeholder?: string;
  /** Etikett vist over palette-en. */
  label?: string;
}

export function DefaultValueEditor({
  value,
  onChange,
  hideTokens = false,
  rows = 2,
  placeholder = "F.eks. Utført av $firma_navn for $kunde_navn på $prosjektnummer",
  label = "Default-verdi (med tokens)",
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  function handleInsert(tokenKey: string) {
    const { value: next, nextSelection } = insertAtCursor(
      inputRef.current,
      value,
      tokenKey,
    );
    onChange(next || undefined);
    // Re-fokuser så markøren havner rett etter token-en
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(nextSelection, nextSelection);
      }
    });
  }

  function onDragOver(e: DragEvent<HTMLTextAreaElement>) {
    if (
      e.dataTransfer.types.includes("application/x-echoo-token") ||
      e.dataTransfer.types.includes("text/plain")
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function onDrop(e: DragEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    const token =
      e.dataTransfer.getData("application/x-echoo-token") ||
      e.dataTransfer.getData("text/plain");
    if (!token.startsWith("$")) return;
    handleInsert(token);
  }

  const showPreview = !hideTokens && hasTokens(value);
  const previewProject = samplePreviewProject();
  const previewSettings = samplePreviewSettings();
  const previewText = showPreview
    ? applyTokens(value, previewProject, previewSettings)
    : "";

  return (
    <div className="space-y-2">
      {!hideTokens && (
        <>
          <div className="text-xs text-text-3">{label}</div>
          <TokenPalette onInsert={handleInsert} />
        </>
      )}
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value || undefined)}
        onDragOver={hideTokens ? undefined : onDragOver}
        onDrop={hideTokens ? undefined : onDrop}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded px-2 py-1.5 text-base sm:text-sm bg-surface border border-border focus:border-orange focus:outline-none"
      />
      {showPreview && (
        <div className="rounded border border-border bg-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-text-3 mb-1">
            Forhåndsvisning (med eksempel-data)
          </div>
          <div className="text-sm text-text-1 whitespace-pre-wrap">
            {previewText}
          </div>
        </div>
      )}
    </div>
  );
}
