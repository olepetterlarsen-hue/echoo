"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { recordObjectiveMeasurement } from "../../actions";

export function MeasurementForm({
  objectiveId,
  unit,
}: {
  objectiveId: string;
  unit: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(value);
    if (Number.isNaN(n)) {
      setError("Verdi må være et tall.");
      return;
    }
    startTransition(async () => {
      const res = await recordObjectiveMeasurement({
        objectiveId,
        value: n,
        notes,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setValue("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="flex gap-2 items-end">
        <Field label={`Verdi${unit ? ` (${unit})` : ""}`} required>
          <Input
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Lagrer…" : "Lagre"}
        </Button>
      </div>
      <Field label="Notat">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </Field>
      {error && <div className="text-sm text-red">{error}</div>}
    </form>
  );
}
