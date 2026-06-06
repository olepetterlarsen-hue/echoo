import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { getServerT } from "@/lib/i18n/server";

interface PageProps {
  searchParams: Promise<{ redirectTo?: string; error?: string; reset?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { redirectTo, error, reset } = await searchParams;
  const { locale, t } = await getServerT();

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/echoo-wordmark.svg"
            alt="Echoo"
            width={160}
            height={45}
            priority
          />
          <p className="text-text-3 text-xs mt-3">{t("login_subtitle")}</p>
        </div>
        <LoginForm
          redirectTo={redirectTo}
          initialError={error}
          resetSent={reset === "1"}
          locale={locale}
        />
        <p className="text-center text-sm text-text-2 mt-6">
          {t("login_no_account")}{" "}
          <Link href="/signup" className="text-orange hover:underline">
            {t("login_signup_link")}
          </Link>
        </p>
        <p className="text-center text-xs text-text-3 mt-8">{t("login_footer")}</p>
      </div>
    </main>
  );
}
