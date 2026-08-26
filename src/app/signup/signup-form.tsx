"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { signUpOrganization } from "./actions";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/i18n/strings";
import { useHydrated } from "@/lib/hooks/use-hydrated";

interface Props {
  initialError?: string;
  locale: Locale;
  plan?: "base" | "iso";
}

const EMPLOYEE_RANGES: { value: string; label: string }[] = [
  { value: "1-5", label: "1–5" },
  { value: "6-20", label: "6–20" },
  { value: "21-50", label: "21–50" },
  { value: "51-200", label: "51–200" },
  { value: "200+", label: "200+" },
];

export function SignupForm({ initialError, locale, plan }: Props) {
  const [firma, setFirma] = useState("");
  const [orgNr, setOrgNr] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeRange, setEmployeeRange] = useState("6-20");
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signUpOrganization({
        firma,
        org_nr: orgNr,
        full_name: fullName,
        email,
        password,
        employee_range: employeeRange,
        plan,
        newsletter_consent: newsletterConsent,
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label={tr("signup_company_name", locale)} required>
        <Input
          value={firma}
          onChange={(e) => setFirma(e.target.value)}
          placeholder={tr("signup_company_placeholder", locale)}
          required
          autoFocus
        />
      </Field>

      <Field label={tr("signup_org_number", locale)} hint={tr("signup_org_number_hint", locale)}>
        <Input
          value={orgNr}
          onChange={(e) => setOrgNr(e.target.value)}
          placeholder="123 456 789"
        />
      </Field>

      <Field label={tr("signup_employee_count", locale)}>
        <select
          value={employeeRange}
          onChange={(e) => setEmployeeRange(e.target.value)}
          className="w-full h-10 rounded-md px-3 text-sm bg-surface border border-border focus:border-orange focus:outline-none"
        >
          {EMPLOYEE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="border-t border-border pt-4 mt-4">
        <p className="text-xs text-text-3 mb-3">{tr("signup_admin_intro", locale)}</p>

        <Field label={tr("signup_your_name", locale)} required>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </Field>

        <Field label={tr("auth_email", locale)} required>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label={tr("auth_password", locale)} required hint={tr("signup_password_hint", locale)}>
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={newsletterConsent}
          onChange={(e) => setNewsletterConsent(e.target.checked)}
          className="mt-0.5 accent-orange shrink-0"
        />
        <span className="text-xs text-text-2">
          Ja, jeg ønsker å motta nyheter, tips og oppdateringer om Echoo på e-post.
          Du kan melde deg av når som helst.
        </span>
      </label>

      {error && (
        <p className="text-sm text-red bg-red/10 border border-red/30 rounded px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending || !hydrated} className="w-full">
        {!hydrated
          ? tr("loading", locale)
          : pending
            ? tr("signup_creating", locale)
            : tr("signup_create_btn", locale)}
      </Button>

      <p className="text-[11px] text-text-3 text-center">
        {tr("signup_terms_prefix", locale)}
      </p>
    </form>
  );
}
