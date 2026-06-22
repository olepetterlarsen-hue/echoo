"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Plus, ChevronUp, ChevronDown, Trash2, Power } from "lucide-react";
import {
  createStage,
  updateStage,
  deleteStage,
  reorderStage,
} from "./actions";

interface Stage {
  id: string;
  name: string;
  color: string;
  order_index: number;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  field_schema: Array<{ key: string; label: string; kind: string }> | unknown;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  order_index: number;
}

type Tab = "stadier" | "kategorier" | "maler";

interface Props {
  initialTab: Tab;
  stages: Stage[];
  categories: Category[];
  templates: Template[];
}

export function SetupTabs({
  initialTab,
  stages,
  categories,
  templates,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="space-y-4">
      <div className="flex border-b border-border gap-1">
        <TabButton active={tab === "stadier"} onClick={() => setTab("stadier")}>
          Stadier <Badge tone="neutral">{stages.length}</Badge>
        </TabButton>
        <TabButton
          active={tab === "kategorier"}
          onClick={() => setTab("kategorier")}
        >
          Kategorier <Badge tone="neutral">{categories.length}</Badge>
        </TabButton>
        <TabButton active={tab === "maler"} onClick={() => setTab("maler")}>
          Maler <Badge tone="neutral">{templates.length}</Badge>
        </TabButton>
      </div>

      {tab === "stadier" && <StagesTab stages={stages} />}
      {tab === "kategorier" && <CategoriesTab categories={categories} />}
      {tab === "maler" && <TemplatesTab templates={templates} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
        active
          ? "border-orange text-orange"
          : "border-transparent text-text-2 hover:text-text-1"
      }`}
    >
      {children}
    </button>
  );
}

/* ============================================================
   Stadier — inline CRUD
   ============================================================ */

function StagesTab({ stages }: { stages: Stage[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#9A9AA4");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await createStage({ name: newName, color: newColor });
      if (res.error) {
        setError(res.error);
        return;
      }
      setNewName("");
      setNewColor("#9A9AA4");
      setShowAdd(false);
      router.refresh();
    });
  }

  function patch(id: string, p: { name?: string; color?: string; is_active?: boolean }) {
    startTransition(async () => {
      const res = await updateStage({ id, ...p });
      if (res.error) setError(res.error);
      router.refresh();
    });
  }

  function reorder(id: string, direction: "up" | "down") {
    startTransition(async () => {
      const res = await reorderStage({ id, direction });
      if (res.error) setError(res.error);
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Slette stadium "${name}"? Prosjekter i dette stadiet vil miste kobling.`)) return;
    startTransition(async () => {
      const res = await deleteStage({ id });
      if (res.error) setError(res.error);
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-1">Kanban-stadier</h3>
          <p className="text-xs text-text-3 mt-0.5">
            Kolonnene som vises i <Link href="/kanban" className="text-orange hover:underline">/kanban</Link>. Sortér med pilene.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="size-4 mr-1" />
          Nytt stadium
        </Button>
      </div>
      <CardBody className="!p-0">
        {showAdd && (
          <div className="px-5 py-3 border-b border-border bg-card-hover flex items-end gap-3">
            <Field label="Navn" required>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="F.eks. Tilbud"
                autoFocus
              />
            </Field>
            <Field label="Farge">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-10 w-14 rounded-md border border-border bg-surface"
              />
            </Field>
            <Button size="sm" onClick={add} disabled={pending || !newName.trim()}>
              {pending ? "Lagrer…" : "Legg til"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
              Avbryt
            </Button>
          </div>
        )}
        {error && (
          <div className="px-5 py-2 text-sm text-red bg-red/10 border-b border-border">
            {error}
          </div>
        )}
        {stages.length === 0 ? (
          <div className="p-8 text-center text-text-3 text-sm">
            Ingen stadier ennå. Legg til ditt første.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {stages.map((s, i) => (
              <li
                key={s.id}
                className="px-5 py-3 flex items-center gap-3 hover:bg-card-hover group"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => reorder(s.id, "up")}
                    disabled={i === 0 || pending}
                    className="text-text-3 hover:text-text-1 disabled:opacity-30"
                    aria-label="Flytt opp"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    onClick={() => reorder(s.id, "down")}
                    disabled={i === stages.length - 1 || pending}
                    className="text-text-3 hover:text-text-1 disabled:opacity-30"
                    aria-label="Flytt ned"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
                <span
                  className="inline-block size-3 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <input
                  type="color"
                  value={s.color}
                  onChange={(e) => patch(s.id, { color: e.target.value })}
                  className="size-7 rounded border border-border bg-transparent cursor-pointer"
                  aria-label="Endre farge"
                  title="Endre farge"
                />
                <div className="flex-1 min-w-0">
                  <StageNameInput
                    defaultValue={s.name}
                    isActive={s.is_active}
                    onSave={(name) => {
                      if (name && name !== s.name) patch(s.id, { name });
                    }}
                  />
                </div>
                {!s.is_active && <Badge tone="neutral">Inaktiv</Badge>}
                <button
                  onClick={() => patch(s.id, { is_active: !s.is_active })}
                  disabled={pending}
                  className="text-text-3 hover:text-orange p-1"
                  title={s.is_active ? "Deaktiver" : "Aktiver"}
                  aria-label={s.is_active ? "Deaktiver" : "Aktiver"}
                >
                  <Power className="size-4" />
                </button>
                <button
                  onClick={() => remove(s.id, s.name)}
                  disabled={pending}
                  className="text-text-3 hover:text-red p-1"
                  title="Slett"
                  aria-label="Slett"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function StageNameInput({
  defaultValue,
  isActive,
  onSave,
}: {
  defaultValue: string;
  isActive: boolean;
  onSave: (name: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  // Hold local input i synk når server-data oppdateres (etter reorder/refresh).
  // Eksternt signal — setState er korrekt her, lint-regelen er for streng.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(defaultValue);
  }, [defaultValue]);

  function commit() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== defaultValue) {
      onSave(trimmed);
    } else if (!trimmed) {
      setValue(defaultValue);
    }
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setValue(defaultValue);
          e.currentTarget.blur();
        }
      }}
      className={`w-full bg-transparent border-0 rounded px-1 py-0.5 focus:bg-card focus:ring-1 focus:ring-orange focus:outline-none ${
        isActive ? "text-text-1" : "text-text-3 line-through"
      }`}
      aria-label="Stadium-navn"
    />
  );
}

/* ============================================================
   Kategorier — list + lenker til eksisterende form-routes
   ============================================================ */

function CategoriesTab({ categories }: { categories: Category[] }) {
  return (
    <Card>
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-1">Prosjekt-kategorier</h3>
          <p className="text-xs text-text-3 mt-0.5">
            Strukturerte tilleggsfelter per prosjekttype (f.eks. bolig vs. næring).
          </p>
        </div>
        <Link href="/admin/kategorier/ny">
          <Button size="sm">
            <Plus className="size-4 mr-1" />
            Ny kategori
          </Button>
        </Link>
      </div>
      <CardBody className="!p-0">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-text-3 text-sm">
            Ingen kategorier ennå.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((c) => {
              const fields = Array.isArray(c.field_schema) ? c.field_schema : [];
              return (
                <li key={c.id}>
                  <Link
                    href={`/admin/kategorier/${c.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-card-hover"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-1 truncate">
                        {c.name}
                      </div>
                      <div className="text-xs text-text-3 truncate">
                        <span className="font-mono">{c.slug}</span>
                        {" · "}
                        {fields.length} felt
                        {c.description && ` · ${c.description}`}
                      </div>
                    </div>
                    {c.is_active ? (
                      <Badge tone="green">Aktiv</Badge>
                    ) : (
                      <Badge tone="neutral">Inaktiv</Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/* ============================================================
   Maler — list + lenker
   ============================================================ */

function TemplatesTab({ templates }: { templates: Template[] }) {
  return (
    <Card>
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-1">Prosjekt-maler</h3>
          <p className="text-xs text-text-3 mt-0.5">
            Forhåndsdefinerte oppsett for nye prosjekter — kategori,
            installasjonstype, beskrivelse osv. forhåndsfylt.
          </p>
        </div>
        <Link href="/admin/prosjekt-maler/ny">
          <Button size="sm">
            <Plus className="size-4 mr-1" />
            Ny mal
          </Button>
        </Link>
      </div>
      <CardBody className="!p-0">
        {templates.length === 0 ? (
          <div className="p-8 text-center text-text-3 text-sm">
            Ingen maler ennå.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {templates.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/prosjekt-maler/${t.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-card-hover"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-1 truncate">
                      {t.name}
                    </div>
                    {t.description && (
                      <div className="text-xs text-text-3 truncate">
                        {t.description}
                      </div>
                    )}
                  </div>
                  {t.is_active ? (
                    <Badge tone="green">Aktiv</Badge>
                  ) : (
                    <Badge tone="neutral">Inaktiv</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
