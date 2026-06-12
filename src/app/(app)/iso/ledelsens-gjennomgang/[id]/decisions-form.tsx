"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateManagementReview } from "../../actions";
import type { ManagementReviewStatus } from "@/lib/types/database";

export function DecisionsForm({
  id,
  initialDecisions,
  initialStatus,
  initialNextDate,
}: {
  id: string;
  initialDecisions: string;
  initialStatus: ManagementReviewStatus;
  initialNextDate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState(initialDecisions);
  const [status, setStatus] = useState<ManagementReviewStatus>(initialStatus);
  const [nextDate, setNextDate] = useState(initialNextDate);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateManagementReview({
        id,
        decisions,
        status,
        next_review_date: nextDate || undefined,
        completed_date:
          status === "completed"
            ? new Date().toISOString().slice(0, 10)
            : undefined,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <Field label="Beslutninger og handlinger">
        <Textarea
          value={decisions}
          onChange={(e) => setDecisions(e.target.value)}
          rows={6}
          placeholder="Hva ble besluttet? Hva er neste skritt?"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as ManagementReviewStatus)
            }
            className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="scheduled">Planlagt</option>
            <option value="in_progress">Pågår</option>
            <option value="completed">Ferdig</option>
          </select>
        </Field>
        <Field label="Neste gjennomgang">
          <Input
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
          />
        </Field>
      </div>
      {error && <div className="text-sm text-red">{error}</div>}
      <Button type="submit" disabled={pending}>
        {pending ? "Lagrer…" : "Lagre"}
      </Button>
    </form>
  );
}
