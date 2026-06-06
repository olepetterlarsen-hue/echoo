"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { signIn, requestPasswordReset } from "./actions";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";

interface Props {
  redirectTo?: string;
  initialError?: string;
  resetSent?: boolean;
  locale: Locale;
}

export function LoginForm({ redirectTo, initialError, resetSent, locale }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [info, setInfo] = useState<string | null>(
    resetSent ? tr("login_reset_sent_short", locale) : null,
  );
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await signIn({ email, password, redirectTo });
      if (result?.error) setError(result.error);
    });
  }

  function onReset() {
    setError(null);
    setInfo(null);
    if (!email) {
      setError(tr("login_need_email_first", locale));
      return;
    }
    startTransition(async () => {
      const result = await requestPasswordReset({ email });
      if (result?.error) setError(result.error);
      else setInfo(tr("login_reset_sent_long", locale));
    });
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={tr("auth_email", locale)} required>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={tr("auth_password", locale)} required>
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && (
            <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-green bg-green/10 border border-green/30 rounded px-3 py-2">
              {info}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? tr("login_signing_in", locale) : tr("auth_signin", locale)}
          </Button>
          <button
            type="button"
            onClick={onReset}
            disabled={pending}
            className="block w-full text-center text-sm text-text-2 hover:text-text-1"
          >
            {tr("auth_forgot", locale)}
          </button>
        </form>
      </CardBody>
    </Card>
  );
}
