"use client";

import { useEffect, type RefObject } from "react";

/**
 * Lett focus-trap-hook uten ekstern lib. Holder Tab/Shift+Tab innenfor det
 * angitte container-elementet så lenge `active` er true.
 *
 * Brukes på modaler/overlays slik at tastatur-brukere ikke faller "ut av"
 * modal-en og inn i bakgrunnen.
 *
 * - Setter initialt fokus på det første fokuserbare elementet inne i ref
 *   når active blir true.
 * - Wraper Tab fra siste til første, Shift+Tab fra første til siste.
 * - Forlater fokus-håndtering ved cleanup.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const FOCUSABLE =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function getFocusable(): HTMLElement[] {
      if (!root) return [];
      return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("inert") && el.offsetParent !== null,
      );
    }

    // Initial fokus
    const els = getFocusable();
    if (els.length > 0) {
      els[0].focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (activeEl === first || !root!.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last || !root!.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [active, ref]);
}
