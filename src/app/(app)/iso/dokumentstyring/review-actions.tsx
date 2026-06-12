"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { approveDocument, rejectDocument } from "../actions";

export function ReviewActions({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"none" | "approve" | "reject">("none");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setMode("none");
    setNotes("");
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res =
        mode === "approve"
          ? await approveDocument({ documentId, notes })
          : await rejectDocument({ documentId, reason: notes });
      if (res.error) {
        setError(res.error);
        return;
      }
      reset();
      router.refresh();
    });
  }

  if (mode === "none") {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setMode("approve")}>
          Godkjenn
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => setMode("reject")}
        >
          Avvis
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 w-72">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder={
          mode === "reject"
            ? "Begrunnelse for avvisning (påkrevd)"
            : "Notat (valgfritt)"
        }
      />
      {error && <div className="text-xs text-red">{error}</div>}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === "reject" ? "danger" : "primary"}
          onClick={submit}
          disabled={pending || (mode === "reject" && !notes.trim())}
        >
          {pending
            ? "…"
            : mode === "approve"
              ? "Bekreft godkjenning"
              : "Bekreft avvisning"}
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          Avbryt
        </Button>
      </div>
    </div>
  );
}
