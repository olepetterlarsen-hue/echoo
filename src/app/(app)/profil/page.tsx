import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "./profile-editor";
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

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("profile_title")}</h1>
        <p className="text-text-2 text-sm">{t("profile_page_subtitle")}</p>
      </header>
      <ProfileEditor profile={profile} />
    </div>
  );
}
