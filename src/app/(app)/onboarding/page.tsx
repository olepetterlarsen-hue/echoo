import Link from "next/link";
import { Building2, ImageIcon, Users, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getServerT } from "@/lib/i18n/server";

export default async function OnboardingPage() {
  const { t } = await getServerT();
  return (
    <div className="px-6 py-12 max-w-2xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-semibold">{t("onboarding_title")}</h1>
        <p className="text-text-2 mt-2">{t("onboarding_subtitle")}</p>
      </header>

      <Step
        icon={<Building2 className="size-5" />}
        title={t("onboarding_step1_title")}
        desc={t("onboarding_step1_desc")}
        cta={t("onboarding_step1_cta")}
        href="/admin/innstillinger"
      />
      <Step
        icon={<ImageIcon className="size-5" />}
        title={t("onboarding_step2_title")}
        desc={t("onboarding_step2_desc")}
        cta={t("onboarding_step2_cta")}
        href="/admin/bedrift"
      />
      <Step
        icon={<Users className="size-5" />}
        title={t("onboarding_step3_title")}
        desc={t("onboarding_step3_desc")}
        cta={t("onboarding_step3_cta")}
        href="/admin/brukere"
      />
      <Step
        icon={<Sparkles className="size-5" />}
        title="Importér eksisterende dokumenter"
        desc="Last opp dine PDF-er — AI-en sorterer dem inn i rutiner, skjemaer, stoffkartotek og kompetansebevis. Du bekrefter før noe lagres."
        cta="Start AI-import"
        href="/onboarding/import"
      />

      <div className="text-center pt-4">
        <Link href="/dashboard" className="text-sm text-text-3 hover:text-text-1 underline">
          {t("onboarding_skip")}
        </Link>
      </div>
    </div>
  );
}

function Step({
  icon,
  title,
  desc,
  cta,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  href: string;
}) {
  return (
    <Card>
      <CardBody className="flex items-start gap-4">
        <div className="size-10 rounded-md bg-orange/15 text-orange grid place-items-center shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-text-2 mt-1">{desc}</p>
        </div>
        <Link href={href}>
          <Button size="sm" variant="secondary">
            {cta}
            <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </Link>
      </CardBody>
    </Card>
  );
}
