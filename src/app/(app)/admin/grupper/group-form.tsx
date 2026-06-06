"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { upsertGroup, deleteGroup } from "./actions";

const COLOR_PALETTE = [
  "#9A9AA4",
  "#F47920",
  "#3B82F6",
  "#10B981",
  "#EC4899",
  "#7C3AED",
  "#F59E0B",
  "#EF4444",
];

interface Props {
  mode: "create" | "edit";
  group?: {
    id: string;
    name: string;
    email: string | null;
    description: string | null;
    color: string | null;
  };
}

export function GroupForm({ mode, group }: Props) {
  const { locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: group?.name ?? "",
    email: group?.email ?? "",
    description: group?.description ?? "",
    color: group?.color ?? "#9A9AA4",
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await upsertGroup({
        id: group?.id,
        name: form.name,
        email: form.email,
        description: form.description,
        color: form.color,
      });
      if (res.error) setError(res.error);
      else if (res.id) router.push(`/admin/grupper/${res.id}`);
    });
  }

  function onDelete() {
    if (!group) return;
    if (
      !confirm(
        tr("adm_grp_delete_confirm", locale).replace("{name}", group.name),
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteGroup({ id: group.id });
      if (res.error) setError(res.error);
      else router.push("/admin/grupper");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("adm_grp_basic_info", locale)}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field
            label={tr("adm_grp_name", locale)}
            required
            hint={tr("adm_grp_name_hint", locale)}
          >
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field
            label={tr("adm_grp_dist_email", locale)}
            hint={tr("adm_grp_dist_email_hint", locale)}
          >
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label={tr("adm_grp_description", locale)}>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
            />
          </Field>
          <Field
            label={tr("adm_grp_color", locale)}
            hint={tr("adm_grp_color_hint", locale)}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`size-9 rounded-full border-2 transition-transform hover:scale-110 ${
                    form.color === c
                      ? "border-text-1 ring-2 ring-orange/40"
                      : "border-border"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={tr("adm_grp_pick_color", locale).replace("{c}", c)}
                />
              ))}
            </div>
          </Field>
        </CardBody>
      </Card>

      {error && (
        <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-between gap-3">
        {mode === "edit" && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={pending}
            className="text-red hover:bg-red/10"
          >
            <Trash2 className="size-4" />
            {tr("adm_grp_delete_btn", locale)}
          </Button>
        )}
        <div className="flex gap-3 ml-auto">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            {tr("adm_grp_cancel", locale)}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? tr("adm_grp_saving", locale)
              : mode === "create"
                ? tr("adm_grp_create_btn", locale)
                : tr("adm_grp_save_btn", locale)}
          </Button>
        </div>
      </div>
    </form>
  );
}
