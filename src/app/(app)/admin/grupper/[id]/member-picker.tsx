"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { updateMembers } from "../actions";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
}

interface Props {
  groupId: string;
  allProfiles: Profile[];
  initialMemberIds: string[];
}

export function MemberPicker({
  groupId,
  allProfiles,
  initialMemberIds,
}: Props) {
  const { locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialMemberIds),
  );
  const [search, setSearch] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSuccess(false);
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((p) => p.id)));
  }
  function clearAll() {
    setSelectedIds(new Set());
  }

  function onSave() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await updateMembers({
        groupId,
        userIds: [...selectedIds],
      });
      if (res.error) setError(res.error);
      else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  const q = search.toLowerCase().trim();
  const filtered = q
    ? allProfiles.filter((p) => {
        const hay = (
          (p.full_name || "") +
          " " +
          (p.email || "") +
          " " +
          p.role
        ).toLowerCase();
        return hay.includes(q);
      })
    : allProfiles;

  const initialSet = new Set(initialMemberIds);
  const hasChanges =
    selectedIds.size !== initialSet.size ||
    [...selectedIds].some((id) => !initialSet.has(id));

  return (
    <div className="space-y-3">
      {/* Søke- og visningsmodus */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr("adm_grp_mp_search_ph", locale)}
            className="w-full h-9 rounded-md pl-9 pr-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowEmail((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-card-hover text-text-2"
        >
          {showEmail
            ? tr("adm_grp_mp_show_name", locale)
            : tr("adm_grp_mp_show_email", locale)}
        </button>
        <button
          type="button"
          onClick={selectAll}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-card-hover text-text-2"
        >
          {tr("adm_grp_mp_select_all", locale)}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-card-hover text-text-2"
        >
          {tr("adm_grp_mp_clear", locale)}
        </button>
      </div>

      {/* Grid med checkboxer */}
      {filtered.length === 0 ? (
        <p className="text-sm text-text-3 text-center py-6">
          {tr("adm_grp_mp_no_results", locale)}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map((p) => {
            const checked = selectedIds.has(p.id);
            const unknown = tr("adm_grp_mp_unknown", locale);
            const label = showEmail
              ? p.email || p.full_name || unknown
              : p.full_name || p.email || unknown;
            return (
              <label
                key={p.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  checked
                    ? "bg-orange/10 border border-orange/30"
                    : "bg-card border border-border hover:bg-card-hover"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(p.id)}
                  className="size-4 accent-orange shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-1 truncate">{label}</div>
                  <div className="text-xs text-text-3 capitalize">{p.role}</div>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-sm text-text-2">
          {tr("adm_grp_mp_n_selected", locale).replace(
            "{n}",
            String(selectedIds.size),
          )}
          {hasChanges && (
            <span className="text-orange ml-2">
              {tr("adm_grp_mp_changes", locale)}
            </span>
          )}
          {success && (
            <span className="text-green ml-2">
              {tr("adm_grp_mp_saved", locale)}
            </span>
          )}
        </span>
        <Button onClick={onSave} disabled={pending || !hasChanges} size="sm">
          {pending
            ? tr("adm_grp_mp_saving", locale)
            : tr("adm_grp_mp_save", locale)}
        </Button>
      </div>
    </div>
  );
}
