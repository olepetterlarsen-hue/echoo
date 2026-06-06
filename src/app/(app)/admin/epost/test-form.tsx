"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { sendTestEmail } from "./actions";

export function EmailTestForm({
  defaultRecipient,
}: {
  defaultRecipient: string;
}) {
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [subject, setSubject] = useState(tr("adm_email_default_subject", locale));
  const [body, setBody] = useState(tr("adm_email_default_body", locale));
  const [result, setResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await sendTestEmail({ to: recipient, subject, body });
      setResult({
        ok: res.ok,
        msg: res.ok
          ? tr("adm_email_result_ok", locale)
              .replace("{recipient}", recipient)
              .replace("{id}", res.messageId ?? "—")
          : res.error ?? tr("adm_email_result_unknown_err", locale),
      });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label={tr("adm_email_recipient_label", locale)} required>
        <Input
          type="email"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          required
        />
      </Field>
      <Field label={tr("adm_email_subject_label", locale)} required>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </Field>
      <Field label={tr("adm_email_body_label", locale)}>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
        />
      </Field>

      {result && (
        <div
          className={`p-3 rounded border text-sm flex items-start gap-2 ${
            result.ok
              ? "bg-green/10 border-green/30 text-green"
              : "bg-red/10 border-red/30 text-red"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
          )}
          {result.msg}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !recipient}>
          <Send className="size-4" />
          {pending
            ? tr("adm_email_sending", locale)
            : tr("adm_email_send_test", locale)}
        </Button>
      </div>
    </form>
  );
}
