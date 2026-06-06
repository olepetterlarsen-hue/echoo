"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Bug, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { submitIssueReport } from "@/app/(app)/actions/issue-reports";

type Severity = "lav" | "middels" | "hoey";

export function ReportIssueButton() {
  const { locale } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("middels");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setSeverity("middels");
    setStatus("idle");
    setError(null);
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setError(null);
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;
    const pageUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${pathname}`
        : pathname;
    startTransition(async () => {
      const res = await submitIssueReport({
        title,
        description,
        severity,
        page_url: pageUrl,
        user_agent: userAgent,
      });
      if (res?.error) {
        setStatus("error");
        setError(res.error);
      } else {
        setStatus("sent");
        setTimeout(close, 1600);
      }
    });
  }

  return (
    <>
      {/* Floating trigger — synlig på alle (app)-sider */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={tr("issue_button", locale)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-orange text-bg px-4 py-2.5 text-sm font-semibold shadow-lg hover:bg-orange/90 transition-colors"
      >
        <Bug className="size-4" />
        <span className="hidden sm:inline">{tr("issue_button", locale)}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 grid place-items-center px-4"
          onClick={close}
        >
          <div
            className="w-full max-w-md bg-surface border border-border rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Bug className="size-4 text-orange" />
                {tr("issue_modal_title", locale)}
              </h2>
              <button
                type="button"
                onClick={close}
                className="text-text-3 hover:text-text-1"
                aria-label="close"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-5 space-y-4">
              <p className="text-xs text-text-3">
                {tr("issue_modal_help", locale)}
              </p>

              <Field label={tr("issue_title_label", locale)} required>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={tr("issue_title_placeholder", locale)}
                  required
                  maxLength={200}
                  autoFocus
                />
              </Field>

              <Field label={tr("issue_description_label", locale)}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={tr("issue_description_placeholder", locale)}
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-md px-3 py-2 text-sm bg-card border border-border focus:border-orange focus:outline-none"
                />
              </Field>

              <Field label={tr("issue_severity_label", locale)}>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { val: "lav" as const, label: tr("issue_severity_low", locale) },
                      {
                        val: "middels" as const,
                        label: tr("issue_severity_medium", locale),
                      },
                      { val: "hoey" as const, label: tr("issue_severity_high", locale) },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setSeverity(opt.val)}
                      className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${
                        severity === opt.val
                          ? "bg-orange/15 text-orange border-orange"
                          : "bg-card border-border text-text-2 hover:bg-card-hover"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>

              {status === "sent" && (
                <p className="text-sm text-green bg-green/10 border border-green/30 rounded px-3 py-2">
                  {tr("issue_sent", locale)}
                </p>
              )}
              {status === "error" && (
                <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
                  {error ?? tr("issue_send_failed", locale)}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={close} disabled={pending}>
                  {tr("cancel", locale)}
                </Button>
                <Button type="submit" disabled={pending || status === "sent"}>
                  {pending ? tr("issue_sending", locale) : tr("issue_submit", locale)}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
