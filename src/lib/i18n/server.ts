import { cookies } from "next/headers";
import type { Locale } from "./index";
import { S } from "./strings";

export const LOCALE_COOKIE = "opcontrol-locale";
export const DEFAULT_LOCALE: Locale = "no";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return raw === "en" || raw === "no" ? raw : DEFAULT_LOCALE;
}

export async function getServerT() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: keyof typeof S) => S[key][locale],
  };
}
