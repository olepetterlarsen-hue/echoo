"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type Theme = "lin" | "dark";

const COOKIE_NAME = "echoo-theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 år

export async function setThemePreference(theme: Theme): Promise<void> {
  // Skriv cookie umiddelbart så neste request rendres riktig
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, theme, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // Persister på profil for innloggede brukere — synkroniserer på tvers av
  // enheter og overlever localStorage-rydd.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // theme_preference er en ny kolonne i migration 062. Cast til never inntil
    // generated Database-typer regenereres mot prod-Supabase.
    await supabase
      .from("profiles")
      .update({ theme_preference: theme } as never)
      .eq("id", user.id);
  }
}
