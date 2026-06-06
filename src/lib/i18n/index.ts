"use client";

import { createContext, useContext } from "react";

export type Locale = "no" | "en";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: "no",
  setLocale: () => {},
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function t(value: { no: string; en: string }, locale: Locale) {
  return value[locale];
}
