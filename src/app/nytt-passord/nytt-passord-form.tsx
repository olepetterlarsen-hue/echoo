"use client";

import { useState, useTransition } from "react";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setForcedPassword } from "./actions";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export function NyttPassordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passordene er ikke like.");
      return;
    }
    startTransition(async () => {
      const res = await setForcedPassword({ password });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nytt passord" required hint="Minst 8 tegn">
        <Input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Bekreft nytt passord" required>
        <Input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </Field>

      {error && (
        <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending || !hydrated} className="w-full">
        {!hydrated ? "Laster…" : pending ? "Bytter passord…" : "Bytt passord"}
      </Button>
    </form>
  );
}
