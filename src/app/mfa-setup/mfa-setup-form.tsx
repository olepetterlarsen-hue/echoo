"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/app/qr-code";
import {
  enrollTotp,
  confirmTotp,
  unenrollTotp,
} from "../(app)/profil/mfa-actions";

export function MfaSetupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<{
    factor_id: string;
    qr_svg: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");

  function startEnroll() {
    setError(null);
    startTransition(async () => {
      const res = await enrollTotp();
      if (res.error || !res.factor_id || !res.qr_svg || !res.secret) {
        setError(res.error ?? "Klarte ikke starte enrollment.");
        return;
      }
      setEnrollment({
        factor_id: res.factor_id,
        qr_svg: res.qr_svg,
        secret: res.secret,
      });
    });
  }

  function confirm() {
    if (!enrollment) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmTotp({
        factor_id: enrollment.factor_id,
        code,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }

  function cancel() {
    if (!enrollment) return;
    startTransition(async () => {
      await unenrollTotp({ factor_id: enrollment.factor_id });
      setEnrollment(null);
      setCode("");
      setError(null);
    });
  }

  if (!enrollment) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-2">
          Bruk en autentiserings-app som Google Authenticator, 1Password,
          Authy eller Bitwarden. Skann QR-koden og bekreft med et 6-sifret
          engangspassord.
        </p>
        {error && <div className="text-sm text-red">{error}</div>}
        <Button onClick={startEnroll} disabled={pending} className="w-full">
          {pending ? "Starter…" : "Start enrollment"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-2">
        <QrCode value={enrollment.qr_svg} size={192} />
        <div className="text-center">
          <div className="text-xs text-text-3">
            Eller skriv inn nøkkelen manuelt:
          </div>
          <code className="text-xs font-mono text-text-1 break-all">
            {enrollment.secret}
          </code>
        </div>
      </div>
      <Field label="6-sifret kode" required>
        <Input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="000000"
          autoComplete="one-time-code"
          autoFocus
        />
      </Field>
      {error && <div className="text-sm text-red">{error}</div>}
      <div className="flex gap-2">
        <Button
          onClick={confirm}
          disabled={pending || code.length !== 6}
          className="flex-1"
        >
          {pending ? "Verifiserer…" : "Bekreft og fortsett"}
        </Button>
        <Button variant="ghost" onClick={cancel} disabled={pending}>
          Avbryt
        </Button>
      </div>
    </div>
  );
}
