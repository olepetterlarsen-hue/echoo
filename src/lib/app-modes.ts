// To-modus app-arkitektur: Planner og Kvalitet er separate verktøy som
// deler samme prosjekt-entitet, men har ulike undermenyer og perspektiver.
//
// Planner = planlegging av oppdrag (kanban, kunder, sites, kart)
// Kvalitet = dokumentasjon og kontroll (avvik, skjemaer, rutiner, håndbok, kompetanse)
//
// Prosjekt-listen og dashboard er felles. Prosjekt-detaljen har to faner
// (Planlegging og Kvalitet) som lar deg bevege deg mellom perspektivene
// på samme prosjekt.

export type AppMode = "planner" | "kvalitet";

// Hver rute tilhører ett modus, eller "both" hvis felles.
type RouteOwnership = "planner" | "kvalitet" | "both";

const ROUTE_MAP: Array<{ prefix: string; owner: RouteOwnership }> = [
  // Felles
  { prefix: "/dashboard", owner: "both" },
  { prefix: "/mine-oppgaver", owner: "both" },
  { prefix: "/oppgaver", owner: "both" },
  { prefix: "/prosjekter", owner: "both" },
  { prefix: "/profil", owner: "both" },
  { prefix: "/admin", owner: "both" },

  // Planner-spesifikt
  { prefix: "/kanban", owner: "planner" },
  { prefix: "/kalender", owner: "planner" },
  { prefix: "/produksjonsplan", owner: "planner" },
  { prefix: "/kunder", owner: "planner" },
  { prefix: "/sites", owner: "planner" },
  { prefix: "/kart", owner: "planner" },

  // Kvalitet-spesifikt
  { prefix: "/skjemaer", owner: "kvalitet" },
  { prefix: "/avvik", owner: "kvalitet" },
  { prefix: "/kompetanse", owner: "kvalitet" },
  { prefix: "/stoffkartotek", owner: "kvalitet" },
  { prefix: "/rutiner", owner: "kvalitet" },
  { prefix: "/handbok", owner: "kvalitet" },
];

// Returner modus utfra path. For "both"-ruter returneres null så caller
// kan falle tilbake til preferanse (cookie/localStorage).
export function getModeFromPath(pathname: string): AppMode | null {
  // Sorter etter prefiks-lengde så vi matcher mest spesifikk først
  const sorted = [...ROUTE_MAP].sort(
    (a, b) => b.prefix.length - a.prefix.length,
  );
  for (const r of sorted) {
    if (pathname === r.prefix || pathname.startsWith(r.prefix + "/")) {
      if (r.owner === "both") return null;
      return r.owner;
    }
  }
  return null;
}

// Sjekk om en rute er felles
export function isSharedRoute(pathname: string): boolean {
  return getModeFromPath(pathname) === null;
}
