"use client";

import { useEffect, useState, useTransition } from "react";
import { Sun, Moon } from "lucide-react";
import { setThemePreference } from "@/lib/theme/actions";
import type { Theme } from "@/lib/theme/types";

interface Props {
  initialTheme: Theme;
}

export function ThemeToggle({ initialTheme }: Props) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [pending, startTransition] = useTransition();

  // Hold DOM i synk hvis state endrer seg på klient (etter første render
  // er server-rendered html allerede stilt riktig via cookie + data-theme).
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [theme]);

  function toggle() {
    const next: Theme = theme === "dark" ? "lin" : "dark";
    setTheme(next); // Optimistisk DOM-oppdatering
    startTransition(async () => {
      await setThemePreference(next);
    });
  }

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={isDark ? "Bytt til lyst tema (Lin)" : "Bytt til mørkt tema"}
      aria-label={isDark ? "Bytt til lyst tema" : "Bytt til mørkt tema"}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm text-text-2 hover:bg-card hover:text-text-1 transition-colors disabled:opacity-60"
    >
      {isDark ? (
        <>
          <Sun className="size-4" />
          <span>Lin (lyst)</span>
        </>
      ) : (
        <>
          <Moon className="size-4" />
          <span>Mørkt</span>
        </>
      )}
    </button>
  );
}
