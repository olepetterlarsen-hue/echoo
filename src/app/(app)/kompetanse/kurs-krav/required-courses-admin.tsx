"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Plus, Trash2, Power } from "lucide-react";
import {
  createRequiredCourse,
  updateRequiredCourse,
  deleteRequiredCourse,
} from "./actions";

interface Course {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  validity_months: number | null;
  is_active: boolean;
  order_index: number;
}

interface Props {
  courses: Course[];
}

export function RequiredCoursesAdmin({ courses }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    validity_months: 12,
  });

  function add() {
    setError(null);
    if (!form.name.trim()) {
      setError("Navn er påkrevd.");
      return;
    }
    startTransition(async () => {
      const res = await createRequiredCourse({
        name: form.name,
        description: form.description,
        category: form.category,
        validity_months: form.validity_months || null,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setShowAdd(false);
      setForm({ name: "", description: "", category: "", validity_months: 12 });
      router.refresh();
    });
  }

  function patch(id: string, p: Partial<Course>) {
    startTransition(async () => {
      const res = await updateRequiredCourse({
        ...(p as Parameters<typeof updateRequiredCourse>[0]),
        id,
      });
      if (res.error) setError(res.error);
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (
      !confirm(
        `Slette "${name}"? Eksisterende sertifikater beholdes, men mister koblingen.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteRequiredCourse({ id });
      if (res.error) setError(res.error);
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Påkrevde kurs ({courses.length})</h3>
          <p className="text-xs text-text-3 mt-0.5">
            Aktive kurs vises i kursmatrisen og brukes i AI-cert-import.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="size-4 mr-1" />
          Nytt kurs
        </Button>
      </div>
      <CardBody className="!p-0">
        {showAdd && (
          <div className="p-5 border-b border-border bg-card-hover space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Navn" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="F.eks. FSE-kurs lavspenning"
                  autoFocus
                />
              </Field>
              <Field label="Kategori">
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  placeholder="Elsikkerhet / HMS / Annet"
                />
              </Field>
            </div>
            <Field label="Beskrivelse" hint="Kort om hva kurset dekker">
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <Field
              label="Gyldighet i måneder"
              hint="0 = ingen utløp (f.eks. fagbrev)"
            >
              <Input
                type="number"
                min={0}
                max={120}
                value={form.validity_months}
                onChange={(e) =>
                  setForm({
                    ...form,
                    validity_months: Number(e.target.value) || 0,
                  })
                }
              />
            </Field>
            {error && <div className="text-sm text-red">{error}</div>}
            <div className="flex gap-2">
              <Button size="sm" onClick={add} disabled={pending}>
                {pending ? "Lagrer…" : "Legg til"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAdd(false)}
              >
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {courses.length === 0 ? (
          <div className="p-8 text-center text-text-3 text-sm">
            Ingen kurs definert ennå.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-card-hover text-text-3 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2.5">Navn</th>
                <th className="text-left px-4 py-2.5">Kategori</th>
                <th className="text-left px-4 py-2.5">Gyldighet</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-card-hover">
                  <td className="px-4 py-3">
                    <div
                      className={
                        c.is_active ? "text-text-1" : "text-text-3 line-through"
                      }
                    >
                      {c.name}
                    </div>
                    {c.description && (
                      <div className="text-xs text-text-3 mt-0.5">
                        {c.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-2">
                    {c.category ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-text-2">
                    {c.validity_months === null || c.validity_months === 0
                      ? "Ingen utløp"
                      : `${c.validity_months} mnd`}
                  </td>
                  <td className="px-4 py-3">
                    {c.is_active ? (
                      <Badge tone="green">Aktiv</Badge>
                    ) : (
                      <Badge tone="neutral">Inaktiv</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => patch(c.id, { is_active: !c.is_active })}
                      disabled={pending}
                      className="text-text-3 hover:text-orange p-1 inline"
                      title={c.is_active ? "Deaktiver" : "Aktiver"}
                      aria-label={c.is_active ? "Deaktiver" : "Aktiver"}
                    >
                      <Power className="size-4" />
                    </button>
                    <button
                      onClick={() => remove(c.id, c.name)}
                      disabled={pending}
                      className="text-text-3 hover:text-red p-1 inline"
                      title="Slett"
                      aria-label="Slett"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardBody>
    </Card>
  );
}
