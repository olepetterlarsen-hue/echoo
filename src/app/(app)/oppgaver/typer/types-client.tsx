"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { tr } from "@/lib/i18n/strings";
import type { Locale } from "@/lib/i18n";
import { createTaskType, updateTaskType, deleteTaskType } from "./actions";

interface TaskType {
  id: string;
  slug: string;
  label_no: string;
  label_en: string;
  order_index: number;
  is_active: boolean;
  usage_count: number;
}

export function TaskTypesClient({
  types,
  canEdit,
  locale,
}: {
  types: TaskType[];
  canEdit: boolean;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [newLabelNo, setNewLabelNo] = useState("");
  const [newLabelEn, setNewLabelEn] = useState("");
  const [newOrder, setNewOrder] = useState(100);

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTaskType({
        label_no: newLabelNo,
        label_en: newLabelEn,
        order_index: newOrder,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setNewLabelNo("");
      setNewLabelEn("");
      setNewOrder(100);
      setCreating(false);
      router.refresh();
    });
  }

  function toggleActive(t: TaskType) {
    setError(null);
    startTransition(async () => {
      const res = await updateTaskType({
        id: t.id,
        is_active: !t.is_active,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function confirmDelete(t: TaskType) {
    if (
      !confirm(
        `${tr("task_types_delete_confirm", locale)}\n\n"${t.label_no}" ${
          t.usage_count > 0
            ? tr("task_types_in_use", locale).replace(
                "{n}",
                String(t.usage_count),
              )
            : ""
        }`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await deleteTaskType({ id: t.id });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          {!creating ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              {tr("task_types_new", locale)}
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
            >
              <X className="size-4" />
              {tr("cancel", locale)}
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
          {error}
        </p>
      )}

      {creating && (
        <Card>
          <CardBody>
            <form onSubmit={submitCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label={tr("task_types_col_label", locale)} required>
                  <Input
                    value={newLabelNo}
                    onChange={(e) => setNewLabelNo(e.target.value)}
                    placeholder="f.eks. Service-besøk"
                    autoFocus
                    required
                  />
                </Field>
                <Field label={tr("task_types_col_label_en", locale)}>
                  <Input
                    value={newLabelEn}
                    onChange={(e) => setNewLabelEn(e.target.value)}
                    placeholder="e.g. Service visit"
                  />
                </Field>
                <Field label={tr("task_types_col_order", locale)}>
                  <Input
                    type="number"
                    value={newOrder}
                    onChange={(e) => setNewOrder(Number(e.target.value))}
                  />
                </Field>
              </div>
              <p className="text-xs text-text-3">
                {tr("task_types_slug_hint", locale)}
              </p>
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  {tr("task_types_save", locale)}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="!p-0">
          {types.length === 0 ? (
            <div className="p-8 text-center text-text-3 text-sm">
              {tr("task_types_empty", locale)}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-card-hover text-text-3 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5">
                    {tr("task_types_col_label", locale)}
                  </th>
                  <th className="text-left px-4 py-2.5 hidden md:table-cell">
                    {tr("task_types_col_slug", locale)}
                  </th>
                  <th className="text-right px-4 py-2.5 hidden md:table-cell">
                    {tr("task_types_col_order", locale)}
                  </th>
                  <th className="text-left px-4 py-2.5">
                    {tr("task_types_col_active", locale)}
                  </th>
                  <th className="text-right px-4 py-2.5">Bruk</th>
                  {canEdit && <th className="text-right px-4 py-2.5"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {types.map((tp) => (
                  <TaskTypeRow
                    key={tp.id}
                    type={tp}
                    canEdit={canEdit}
                    isEditing={editing === tp.id}
                    onEdit={() => setEditing(tp.id)}
                    onCancelEdit={() => setEditing(null)}
                    onSaved={() => {
                      setEditing(null);
                      router.refresh();
                    }}
                    onToggle={() => toggleActive(tp)}
                    onDelete={() => confirmDelete(tp)}
                    pending={pending}
                    locale={locale}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function TaskTypeRow({
  type: t,
  canEdit,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaved,
  onToggle,
  onDelete,
  pending,
  locale,
}: {
  type: TaskType;
  canEdit: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onToggle: () => void;
  onDelete: () => void;
  pending: boolean;
  locale: Locale;
}) {
  const [labelNo, setLabelNo] = useState(t.label_no);
  const [labelEn, setLabelEn] = useState(t.label_en);
  const [order, setOrder] = useState(t.order_index);
  const [saving, startSaving] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);

  function save() {
    setRowError(null);
    startSaving(async () => {
      const res = await updateTaskType({
        id: t.id,
        label_no: labelNo,
        label_en: labelEn,
        order_index: order,
      });
      if (res.error) {
        setRowError(res.error);
        return;
      }
      onSaved();
    });
  }

  if (isEditing) {
    return (
      <tr className="bg-orange/5">
        <td className="px-4 py-3">
          <Input
            value={labelNo}
            onChange={(e) => setLabelNo(e.target.value)}
          />
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <Input
            value={labelEn}
            onChange={(e) => setLabelEn(e.target.value)}
            placeholder="(EN)"
          />
        </td>
        <td className="px-4 py-3 hidden md:table-cell text-right">
          <Input
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            className="w-20 text-right"
          />
        </td>
        <td className="px-4 py-3 text-text-3 text-xs">
          {t.is_active ? "Aktiv" : tr("task_types_inactive", locale)}
        </td>
        <td className="px-4 py-3 text-right text-text-3 text-xs">
          {t.usage_count}
        </td>
        <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
          {rowError && (
            <span className="text-red text-xs mr-2">{rowError}</span>
          )}
          <button
            onClick={save}
            disabled={saving || pending}
            className="px-2 py-1 bg-green text-bg rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "…" : tr("task_types_save", locale)}
          </button>
          <button
            onClick={onCancelEdit}
            disabled={saving}
            className="px-2 py-1 text-text-2 hover:text-text-1 text-xs"
          >
            {tr("cancel", locale)}
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-card-hover">
      <td className="px-4 py-3">
        <div className="font-medium text-text-1">{t.label_no}</div>
        <div className="text-xs text-text-3 md:hidden">{t.slug}</div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <code className="text-xs text-text-3">{t.slug}</code>
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-right text-text-2">
        {t.order_index}
      </td>
      <td className="px-4 py-3">
        {t.is_active ? (
          <Badge tone="green">Aktiv</Badge>
        ) : (
          <Badge tone="neutral">{tr("task_types_inactive", locale)}</Badge>
        )}
      </td>
      <td className="px-4 py-3 text-right text-text-2 text-xs">
        {t.usage_count}
      </td>
      {canEdit && (
        <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
          <button
            onClick={onToggle}
            disabled={pending}
            className="px-2 py-1 text-text-3 hover:text-text-1 text-xs"
          >
            {t.is_active ? "Deaktivér" : "Aktivér"}
          </button>
          <button
            onClick={onEdit}
            disabled={pending}
            className="px-2 py-1 text-text-3 hover:text-orange text-xs inline-flex items-center gap-1"
          >
            <Pencil className="size-3" />
          </button>
          <button
            onClick={onDelete}
            disabled={pending}
            className="px-2 py-1 text-text-3 hover:text-red text-xs inline-flex items-center gap-1"
          >
            <Trash2 className="size-3" />
          </button>
        </td>
      )}
    </tr>
  );
}
