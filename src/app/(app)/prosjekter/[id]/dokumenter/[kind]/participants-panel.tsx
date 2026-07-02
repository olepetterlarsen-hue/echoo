"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenLine, UserPlus, X as XIcon, Check } from "lucide-react";
import type {
  DocumentKind,
  DocumentParticipant,
  Profile,
} from "@/lib/types/database";
import {
  addDocumentParticipants,
  signAsParticipant,
  removeDocumentParticipant,
} from "./actions";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

export type ParticipantWithProfile = DocumentParticipant & {
  profile: { id: string; full_name: string | null; email: string } | null;
};

export type OrgMember = Pick<Profile, "id" | "full_name" | "email">;

interface Props {
  projectId: string | null;
  kind: DocumentKind;
  existingId: string | null;
  data: Record<string, unknown>;
  participants: ParticipantWithProfile[];
  orgMembers: OrgMember[];
  currentProfile: Profile;
  isSigned: boolean;
}

export function ParticipantsPanel({
  projectId,
  kind,
  existingId,
  data,
  participants,
  orgMembers,
  currentProfile,
  isSigned,
}: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const dateLocale = locale === "en" ? "en-GB" : "no-NO";
  const addedIds = new Set(participants.map((p) => p.profile_id));
  const addable = orgMembers.filter((m) => !addedIds.has(m.id));
  const mine = participants.find(
    (p) => p.profile_id === currentProfile.id && p.status === "ventende",
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSendRequests() {
    if (selected.size === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await addDocumentParticipants({
        projectId,
        kind,
        existingId,
        data,
        profileIds: [...selected],
      });
      if (res.error) setError(res.error);
      else {
        setSelected(new Set());
        setPicking(false);
        router.refresh();
      }
    });
  }

  function onSignSelf() {
    if (!mine) return;
    if (!currentProfile.signature_data_url) {
      setError(tr("proj_doc_no_signature_error", locale));
      return;
    }
    if (!confirm(tr("proj_doc_participant_confirm_sign", locale))) return;
    setError(null);
    startTransition(async () => {
      const res = await signAsParticipant({ participantId: mine.id });
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function onRemove(participantId: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeDocumentParticipant({ participantId });
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tr("proj_doc_participants_title", locale)}</CardTitle>
        <p className="text-xs text-text-3 mt-1">
          {tr("proj_doc_participants_desc", locale)}
        </p>
      </CardHeader>
      <CardBody className="space-y-3">
        {mine && (
          <Button
            onClick={onSignSelf}
            disabled={pending || !currentProfile.signature_data_url}
            className="w-full min-h-12 text-base"
          >
            <PenLine className="size-5" />
            {tr("proj_doc_participant_sign_self", locale)}
          </Button>
        )}
        {mine && !currentProfile.signature_data_url && (
          <p className="text-xs text-text-3">
            {tr("proj_doc_help_no_signature", locale)}
          </p>
        )}

        {participants.length === 0 && (
          <p className="text-sm text-text-3">
            {tr("proj_doc_participants_empty", locale)}
          </p>
        )}

        {participants.length > 0 && (
          <ul className="divide-y divide-border">
            {participants.map((p) => {
              const name =
                p.signed_name ??
                p.profile?.full_name ??
                p.profile?.email ??
                "…";
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 min-h-[44px] py-1.5"
                >
                  <span className="flex-1 text-sm truncate">{name}</span>
                  {p.status === "signert" ? (
                    <Badge tone="green">
                      <Check className="size-3" />
                      {tr("proj_doc_participant_signed", locale)}
                      {p.signed_at &&
                        ` · ${new Date(p.signed_at).toLocaleDateString(dateLocale)}`}
                    </Badge>
                  ) : (
                    <Badge tone="yellow">
                      {tr("proj_doc_participant_pending", locale)}
                    </Badge>
                  )}
                  {p.status === "ventende" && !isSigned && (
                    <button
                      type="button"
                      onClick={() => onRemove(p.id)}
                      disabled={pending}
                      className="size-10 shrink-0 text-text-3 hover:text-red flex items-center justify-center"
                      aria-label={tr("proj_doc_remove", locale)}
                    >
                      <XIcon className="size-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!isSigned && !picking && (
          <Button
            variant="secondary"
            onClick={() => setPicking(true)}
            disabled={pending || addable.length === 0}
            className="w-full sm:w-auto min-h-11"
          >
            <UserPlus className="size-4" />
            {addable.length === 0
              ? tr("proj_doc_participants_none_left", locale)
              : tr("proj_doc_participants_add", locale)}
          </Button>
        )}

        {!isSigned && picking && (
          <div className="space-y-2 border border-border rounded-lg p-3">
            <p className="text-xs uppercase tracking-wider text-text-3">
              {tr("proj_doc_participants_pick", locale)}
            </p>
            <ul className="divide-y divide-border">
              {addable.map((m) => {
                const checked = selected.has(m.id);
                return (
                  <li key={m.id}>
                    <label className="flex items-center gap-3 min-h-[44px] py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(m.id)}
                        className="size-5 accent-orange shrink-0"
                      />
                      <span className="flex-1 text-base sm:text-sm truncate">
                        {m.full_name ?? m.email}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={onSendRequests}
                disabled={pending || selected.size === 0}
                className="min-h-11"
              >
                {pending
                  ? tr("proj_doc_participants_sending", locale)
                  : `${tr("proj_doc_participants_send", locale)}${selected.size > 0 ? ` (${selected.size})` : ""}`}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPicking(false);
                  setSelected(new Set());
                }}
                disabled={pending}
                className="min-h-11"
              >
                {tr("proj_doc_participants_cancel", locale)}
              </Button>
            </div>
            <p className="text-[11px] text-text-3">
              {tr("proj_doc_participants_task_hint", locale)}
            </p>
          </div>
        )}

        {error && (
          <div className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
            {error}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
