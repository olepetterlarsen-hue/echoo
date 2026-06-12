import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "./profile-editor";
import { MfaSection } from "./mfa-section";
import { getServerT } from "@/lib/i18n/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { t } = await getServerT();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  // MFA-faktorer + org-policy
  const [{ data: factorList }, { data: org }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    profile.organization_id
      ? supabase
          .from("organizations")
          .select("require_2fa")
          .eq("id", profile.organization_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const totpFactors =
    factorList?.totp?.map((f) => ({
      id: f.id,
      friendly_name: f.friendly_name ?? null,
      status: f.status as "verified" | "unverified",
      created_at: f.created_at,
    })) ?? [];

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("profile_title")}</h1>
        <p className="text-text-2 text-sm">{t("profile_page_subtitle")}</p>
      </header>
      <MfaSection
        factors={totpFactors}
        orgRequires2fa={org?.require_2fa ?? false}
      />
      <ProfileEditor profile={profile} />
    </div>
  );
}
