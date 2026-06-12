"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createManagementReview } from "../../actions";

export function MgmtReviewForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: `Ledelsens gjennomgang ${new Date().getFullYear()}`,
    scheduled_date: new Date().toISOString().slice(0, 10),
    participants: "",
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createManagementReview(form);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/iso/ledelsens-gjennomgang/${res.id}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardBody>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Tittel" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>
          <Field label="Planlagt dato" required>
            <Input
              type="date"
              value={form.scheduled_date}
              onChange={(e) =>
                setForm({ ...form, scheduled_date: e.target.value })
              }
              required
            />
          </Field>
          <Field label="Deltakere" hint="Komma-separert liste eller fritekst">
            <Textarea
              value={form.participants}
              onChange={(e) =>
                setForm({ ...form, participants: e.target.value })
              }
              rows={2}
            />
          </Field>
          {error && <div className="text-sm text-red">{error}</div>}
          <Button type="submit" disabled={pending}>
            {pending ? "Oppretter…" : "Opprett gjennomgang"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
