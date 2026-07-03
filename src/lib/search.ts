/**
 * Saniter et fritekst-søk før det interpoleres inn i et PostgREST
 * `.or("col.ilike.%<term>%,...")`-filter.
 *
 * PostgREST tolker komma, parenteser og enkelte andre tegn som
 * filter-syntaks. Uten sanitering kan et søk som `a,role.eq.admin` injisere
 * ekstra filter-ledd (filter-injection). RLS begrenser fortsatt resultatene
 * til brukerens egen org, men vi vil ikke la søket manipulere filteret eller
 * trigge 500-feil. Vi stripper derfor tegnene som har spesialbetydning og
 * som aldri er meningsfulle i et navnesøk.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[,()\\*:"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
