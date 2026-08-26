"use client";

import { useEffect, useState } from "react";

/**
 * True først etter at klienten har hydrert. Brukes til å deaktivere
 * submit-knapper til appen er klar — klikker man før React er hydrert,
 * gjør nettleseren en tom native GET-submit i stedet for å kjøre
 * onSubmit-handleren, og skjemaet blir blankt uten feilmelding (B3).
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Kanonisk "har hydrert"-mønster — kjører nødvendigvis synkront rett
    // etter første commit, ingen kaskaderende rendere i praksis.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);
  return hydrated;
}
