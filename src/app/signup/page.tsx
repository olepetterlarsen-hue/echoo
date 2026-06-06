import Image from "next/image";
import Link from "next/link";
import { SignupForm } from "./signup-form";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignupPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const { locale, t } = await getServerT();

  return (
    <main className="min-h-screen grid place-items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/echoo-wordmark.svg"
            alt="Echoo"
            width={160}
            height={45}
            priority
          />
          <p className="text-text-3 text-xs mt-3">{t("signup_subtitle")}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h1 className="text-lg font-semibold mb-1">{t("signup_title")}</h1>
          <p className="text-sm text-text-2 mb-6">{t("signup_beta_note")}</p>
          <SignupForm initialError={error} locale={locale} />
        </div>

        <p className="text-center text-sm text-text-2 mt-6">
          {t("signup_already")}{" "}
          <Link href="/login" className="text-orange hover:underline">
            {t("signup_login_link")}
          </Link>
        </p>

        <ul className="text-xs text-text-3 mt-8 space-y-2">
          <li>✓ {t("signup_promise_flat")}</li>
          <li>✓ {t("signup_promise_unlimited")}</li>
          <li>✓ {t("signup_promise_no_card")}</li>
        </ul>
      </div>
    </main>
  );
}
