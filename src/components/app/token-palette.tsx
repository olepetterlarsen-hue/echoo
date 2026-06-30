"use client";

// TokenPalette: viser drag-bare $-token-knapper som kan slippes i et
// tekstfelt eller klikkes for å sette inn ved markørposisjonen.
//
// Brukes i admin/maler/-byggerne over felter av kind="text" eller
// "textarea". Tokens er definert i src/lib/document-templates/tokens.ts
// og erstattes med prosjekt-data ved seedData-tid.

import { useState, type DragEvent } from "react";
import { TOKENS, type TokenDef } from "@/lib/document-templates/tokens";

type Group = TokenDef["group"];

const GROUP_LABELS: Record<Group, string> = {
  prosjekt: "Prosjekt",
  kunde: "Kunde",
  anlegg: "Anlegg",
};

interface Props {
  /** Hvilken funksjon som settes inn ved klikk. Tar token-keyen som arg. */
  onInsert: (tokenKey: string) => void;
  /** Compact-modus skjuler gruppe-headere, brukes når plassen er trang. */
  compact?: boolean;
}

export function TokenPalette({ onInsert, compact = false }: Props) {
  const [dragKey, setDragKey] = useState<string | null>(null);

  const grouped = TOKENS.reduce<Record<Group, TokenDef[]>>(
    (acc, t) => {
      (acc[t.group] ??= []).push(t);
      return acc;
    },
    { prosjekt: [], kunde: [], anlegg: [] },
  );

  function onDragStart(e: DragEvent<HTMLButtonElement>, key: string) {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", key);
    e.dataTransfer.setData("application/x-echoo-token", key);
    setDragKey(key);
  }

  function onDragEnd() {
    setDragKey(null);
  }

  return (
    <div className="rounded-md border border-orange/20 bg-orange/5 p-2 space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-text-3 font-semibold px-1">
        Dra eller klikk for å sette inn token
      </div>
      <div className={compact ? "flex flex-wrap gap-1" : "space-y-2"}>
        {(Object.keys(grouped) as Group[]).map((group) => {
          const items = grouped[group];
          if (items.length === 0) return null;
          if (compact) {
            return items.map((t) => (
              <TokenPill
                key={t.key}
                token={t}
                isDragging={dragKey === t.key}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onInsert={onInsert}
              />
            ));
          }
          return (
            <div key={group}>
              <div className="text-[10px] uppercase tracking-wider text-text-3 px-1 mb-1">
                {GROUP_LABELS[group]}
              </div>
              <div className="flex flex-wrap gap-1">
                {items.map((t) => (
                  <TokenPill
                    key={t.key}
                    token={t}
                    isDragging={dragKey === t.key}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onInsert={onInsert}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TokenPill({
  token,
  isDragging,
  onDragStart,
  onDragEnd,
  onInsert,
}: {
  token: TokenDef;
  isDragging: boolean;
  onDragStart: (e: DragEvent<HTMLButtonElement>, key: string) => void;
  onDragEnd: () => void;
  onInsert: (key: string) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => onDragStart(e, token.key)}
      onDragEnd={onDragEnd}
      onClick={() => onInsert(token.key)}
      title={`${token.label} — klikk for å sette inn ved markøren, eller dra inn i felt`}
      className={`inline-flex items-center px-2 h-7 rounded text-xs font-mono border transition-colors cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? "bg-orange/30 border-orange text-orange"
          : "bg-orange/10 border-orange/30 text-orange hover:bg-orange/20"
      }`}
      style={{ touchAction: "none" }}
    >
      {token.key}
    </button>
  );
}

/**
 * Hjelper for å sette inn token i en text/textarea ved gjeldende markør-
 * posisjon. Returnerer ny verdi + ny markør-posisjon. Brukes av både
 * klikk-handler og drop-handler.
 */
export function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  currentValue: string,
  token: string,
): { value: string; nextSelection: number } {
  const start = el?.selectionStart ?? currentValue.length;
  const end = el?.selectionEnd ?? currentValue.length;
  const before = currentValue.slice(0, start);
  const after = currentValue.slice(end);
  const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
  const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);
  const insert =
    (needsSpaceBefore ? " " : "") + token + (needsSpaceAfter ? " " : "");
  return {
    value: before + insert + after,
    nextSelection: start + insert.length,
  };
}
