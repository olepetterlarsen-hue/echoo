"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Send, MessageCircle } from "lucide-react";
import { createComment, deleteComment } from "./comments-actions";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import type { Locale } from "@/lib/i18n";

interface Comment {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author?: { full_name: string | null; email: string | null } | null;
}

interface Props {
  projectId: string;
  currentUserId: string;
  isAdmin: boolean;
  initial: Comment[];
}

export function CommentsBlock({
  projectId,
  currentUserId,
  isAdmin,
  initial,
}: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState(initial);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await createComment({ projectId, body: trimmed });
      if (res.error) {
        setError(res.error);
      } else {
        setBody("");
        router.refresh();
      }
    });
  }

  function onDelete(commentId: string) {
    if (!confirm(tr("proj_comment_confirm_delete", locale))) return;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    startTransition(async () => {
      const res = await deleteComment({ commentId, projectId });
      if (res.error) {
        alert(`${tr("proj_comment_delete_failed", locale)} ${res.error}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Ny kommentar */}
      <form onSubmit={onSubmit} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={tr("proj_comment_placeholder", locale)}
          rows={3}
          maxLength={4000}
          className="w-full rounded-md bg-surface border border-border px-3 py-2 text-sm resize-y focus:border-orange focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-text-3">
            {tr("proj_comment_help", locale)}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={pending || !body.trim()}
          >
            <Send className="size-4" />
            {pending ? tr("proj_comment_sending", locale) : tr("proj_comment_send", locale)}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
            {error}
          </p>
        )}
      </form>

      {/* Feed */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-text-3 text-sm">
          <MessageCircle className="size-6 mx-auto mb-2 opacity-40" />
          {tr("proj_comment_empty", locale)}
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const canDelete = c.author_id === currentUserId || isAdmin;
            return (
              <li
                key={c.id}
                className="border border-border rounded-md p-3 bg-card hover:bg-card-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-text-3">
                    <span className="text-text-1 font-medium">
                      {c.author?.full_name || c.author?.email || tr("proj_comment_unknown_author", locale)}
                    </span>
                    <span className="mx-1.5">·</span>
                    <time>
                      {formatRelativeTime(c.created_at, locale)}
                    </time>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      title={tr("proj_comment_delete_title", locale)}
                      className="text-text-3 hover:text-red transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-text-1 mt-2 whitespace-pre-wrap">
                  {c.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatRelativeTime(iso: string, locale: Locale): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return tr("proj_comment_just_now", locale);
  if (diffSec < 3600)
    return tr("proj_comment_min_ago", locale).replace("{n}", String(Math.floor(diffSec / 60)));
  if (diffSec < 86400)
    return tr("proj_comment_hours_ago", locale).replace("{n}", String(Math.floor(diffSec / 3600)));
  if (diffSec < 7 * 86400)
    return tr("proj_comment_days_ago", locale).replace("{n}", String(Math.floor(diffSec / 86400)));
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "no-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
