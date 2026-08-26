# QA-fiksplan — status

Branch: `fix/qa-pre-launch`. Punkt 7 (bildevedlegg) er bevisst utelatt fra
denne PR-en — se `docs/qa/FIXPLAN.md`: "Ta det i egen PR hvis punkt 1–6 er
klare før det." Kommer som egen, oppfølgende PR.

Alle commits bygger (`npm run build`), linter (`npm run lint`) og passerer
`npm test` (aggregat av alle golden-testene under `scripts/qa/`) individuelt
— verifisert etter hver commit, ikke bare til slutt.

## 1. Avkryssinger i PDF — BLOKKER B1 ✅

- **Fiks**: `Checkbox`-komponent i `src/lib/pdf/render.tsx` erstatter
  Unicode-glyfene ☑/☐ (rendret blankt i Standard-14 Helvetica) med en tegnet
  boks + ASCII `[X]`-tekst. Brukt for `radio`, `checkmark_group`,
  `yna_group`, `yna_measurement_group`.
- **Bevis**: `scripts/qa/golden-pdf-checkboxes.ts` (`npm run test:pdf`) —
  genererer PDF for alle 5 dokumenttyper, teller `[X]`-forekomster i
  uttrukket tekst (pdf-parse) og verifiserer at antallet er nøyaktig lik
  antall besvarte spørsmål i fixturen.
  ```
  OK  samsvarserklaering/bolig: 7 markører, 42395 bytes
  OK  risikovurdering: 18 markører, 41583 bytes
  OK  sluttkontroll: 26 markører, 45136 bytes
  OK  ruh: 2 markører, 27810 bytes
  OK  startup_checklist: 8 markører, 39780 bytes
  ```

## 2. AI-feilhåndtering + helsesjekk — BLOKKER B2 ✅

- **Fiks**: `toSafeAiError()` i `src/lib/ai/assistant.ts` — all AI-feil
  logges server-side (`captureException`, med request-id) og returnerer
  alltid en fast norsk melding, aldri rå upstream-JSON. Ny `GET
  /api/health/ai` (`src/lib/ai/health.ts`, cachet 60s) — import-wizarden
  sjekker denne før opplasting og viser feil FØR filvalg.
- **Bevis**: `scripts/qa/ai-error-handling.test.ts`
  (`npm run test:ai`) — bygger en ekte `Anthropic.APIError.generate(401,
  ...)` identisk med produksjonssymptomet, asserter at
  `toSafeAiError()` returnerer nøyaktig `AI_UNAVAILABLE_MESSAGE` og IKKE
  inneholder `401`/`authentication_error`/`API key`/`request_id`.
- **Ikke gjort**: faktisk nøkkelrotasjon (mennesket gjør det, per
  oppgavebeskrivelsen), og wiring inn i en deploy-pipeline-smoke-test —
  repoet har ingen CI/deploy-workflow i `.github/workflows` å hekte et
  steg på.

## 3. PDF: status, installatørblokk, anleggsadresse, logo — A1, A2, A4 ✅

- **Fiks**: `status: "signert"` settes eksplisitt før PDF-generering
  (var aldri satt — PDF-en ble generert fra objektet FØR databaseoppdateringen).
  Ny installatørblokk (FEL § 12) på samsvarserklæringen. Anleggsadresse +
  kunde i topplokken, arver fra kunde når site er tomt. `getLogoDataUrl()`
  henter nå faktisk `organizations.logo_url` via `fetch()` server-side
  (leste tidligere fra en hardkodet, ikke-eksisterende filsti). Fikset
  spørsmålstelling (talte felt, ikke faktiske spørsmål i grupper).
- **Bevis**: `scripts/qa/golden-pdf-metadata.test.ts`
  (`npm run test:pdf-meta`) — to scenarier (site utfylt / tomt), asserter
  ingen "Utkast", riktig "Signert · v2"-linje, installatørnavn + org.nr i
  PDF-teksten, riktig anleggsadresse i begge scenarier, og at
  spørsmålstallet matcher en uavhengig beregnet forventning.
- **Ikke gjort**: F-20 sin sidemeny-halvdel (vise org-logo i app-shellet i
  stedet for Echoo sin egen wordmark) — produktbeslutning, ikke en
  avgrenset bugfix; påvirker alle sider/organisasjoner.

## 4. PDF-font med full tegnstøtte — A3 ✅

- **Fiks**: DejaVu Sans (Regular/Bold/Oblique, Bitstream Vera-lisens,
  `public/fonts/`) registrert som ny standardfont. `flexShrink: 1` + `wrap`
  på måleverdi- og kommentar-cellene i måletabellen.
- **Bevis**: `scripts/qa/golden-pdf-font.test.ts`
  (`npm run test:pdf-font`) — asserter at Ω Δ µ ° ² ³ ± ø æ å alle finnes i
  uttrukket PDF-tekst (og at "©"-symptomet ikke gjenoppstår), og at en
  55+ tegns måleverdi med Ω er fullt til stede etter wrap (whitespace/
  orddeling-uavhengig sammenligning, siden selve linjebruddene endres av
  fiksen).

## 5. Hydrering + ChunkLoadError — BLOKKER B3 ✅

- **Fiks**: Fant og fikset selve rotårsaken til React #418: `AppShell`
  leste `localStorage` i en lazy `useState`-initializer (kjører på
  klientens FØRSTE render, ulikt serveren) — flyttet til en effect etter
  mount. Ny `useHydrated()`-hook, submit-knappene på signup/ny
  kunde/nytt prosjekt/kursbevis-opplasting er disabled til hydrering er
  ferdig. `isChunkLoadError()`/`reloadOnceForChunkError()` koblet inn i
  begge error-boundaries, med vokterflagg i `sessionStorage`.
- **Bevis**: `scripts/qa/chunk-error.test.ts` (`npm run test:chunk-error`)
  — verifiserer at både webpack- og Turbopack/ESM-varianten gjenkjennes,
  og at reload skjer nøyaktig én gang per sesjon (ikke en løkke).
- **Ikke gjort**: full progressive-enhancement-refaktorering til
  `<form action={serverAction}>` — større arkitekturendring med reell
  regresjonsrisiko per skjema; `useHydrated()` lukker allerede den
  konkrete feilklassen.

## 6. Signeringsrett for bemyndiget admin — B5 ✅

- **Fiks**: PLAN AVVEK FRA ARKITEKTUR — `is_bemyndiget` som foreslått var
  feil forankret (`bemyndiget` er allerede en rolleverdi). Nytt felt
  `profiles.qualified_signer` (migrasjon 077) + delt
  `canSignSamsvar(role, qualifiedSigner)` brukt av BÅDE server
  (`actions.ts`) og klient (`document-editor.tsx` — fant og fikset at
  klienten opprinnelig ikke ville respektert flagget i det hele tatt).
  Ny avkrysningsboks i signup: "Jeg er registrert installatør/bemyndiget
  person".
- **Bevis**: `scripts/qa/samsvar-signing-role.test.ts`
  (`npm run test:signing-role`) — verifiserer installatør/bemyndiget alltid
  kan signere, admin UTEN flagget fortsatt sperret (beviser
  2026-06-26-fiksen ikke reverseres), admin MED flagget kan signere.
- **Ikke gjort**: UI i Innstillinger → Bedrift for å sette flagget på
  eksisterende organisasjoner — AC gjelder eksplisitt "Ny bedrift".

## 7. Bildevedlegg — BLOKKER B4 — EGEN PR (ikke i denne)

Se punkt 7 i `FIXPLAN.md`. Følger som separat, oppfølgende PR.

## 8. Obligatoriske felt ved signering — A5 ✅

- **Fiks**: `findMissingRequiredFields()` i ny
  `src/lib/document-templates/validation.ts` (måtte skilles ut fra
  `index.ts` som drar inn `next/headers` — kan ikke bundles i en
  klientkomponent). Brukt av BÅDE server (fasit) og klient (rask
  feedback). Dekker text/textarea/number/date/select/radio/checkbox.
- **Bevis**: `scripts/qa/required-fields.test.ts`
  (`npm run test:required-fields`) — reproduserer I-39-symptomet nøyaktig
  (tomt `car_registration` på startup_checklist), whitespace-only regnes
  ikke som besvart, required checkbox krever eksplisitt `true`.

## 9. Tvungen passordbytte — A6 ✅

- **Fiks**: `profiles.must_change_password` (migrasjon 078), satt `true`
  når admin oppretter en bruker. `(app)/layout.tsx` redirecter til
  `/nytt-passord` (utenfor `(app)/`, samme mønster som `/mfa-setup`).
  Ny selvbetjent "Endre passord" i `/profil` (fantes ikke på denne
  branchen — implementert fra bunnen, krever gjeldende passord).
- **Ikke automatisert testet**: `signInWithPassword`/`updateUser` krever
  en ekte Supabase-instans. Bør verifiseres manuelt mot en test-org
  (f.eks. Sørby Elektro AS (TEST)):
  1. Opprett bruker via `/admin/brukere` med midlertidig passord.
  2. Logg inn som den brukeren → skal redirecte til `/nytt-passord` og
     ikke slippe til dashbordet før passordet er byttet.
  3. Fra `/profil`, bytt passord med feil gjeldende passord → skal avvises.
  4. Bytt med riktig gjeldende passord → skal lykkes, andre sesjoner
     logges ut.
- **Ikke gjort**: e-post-invitasjon med engangslenke — FIXPLAN merker
  dette "Anbefalt i tillegg", ikke et akseptansekriterium.

## 10. RBAC på alle /admin-ruter — A7 ✅

- **Fiks**: sentral sjekk i `src/lib/supabase/proxy.ts` for hele
  `/admin/*`. Fant TRE reelle hull (verre enn opprinnelig kartlagt):
  `admin/import-wizard` (ingen sjekk noe sted), `GET
  /admin/bulk-import/template` (ingen sjekk), og `admin/abonnement`
  (siden selv hadde ingen sjekk, kun actionen — funnet under dette
  arbeidet). Beslutningslogikk trukket ut i ren `adminGateDecision()`.
- **Bevis**: `scripts/qa/admin-rbac.test.ts` (`npm run test:admin-rbac`)
  — tester alle roller mot alle kjente admin-ruter, inkludert de tre
  hullene og 403-spesialtilfellet for template-nedlastingen.
- **Ikke gjort**: I-27 (begrens kompetanse-opplasting-på-vegne-av til
  admin/godkjenning) — eksplisitt "bør" i planen, ikke AC; ville brutt
  prosjektleder sin eksisterende evne til å laste opp for teamet sitt.

## 11. Opprydning — delmengde ✅

- **Gjort**: norsk 404-side (`not-found.tsx`), rå rolleverdier
  (`profile.role`/`user.role`) byttet til `ROLE_LABELS[role][locale]` i
  `/profil` og admin/brukere-listen, fjernet et feilplassert
  Telenor-spørsmål fra den alminnelige sluttkontroll-malen.
- **Undersøkt, ikke reprodusert**: "SJA-mal med engelsk innhold om
  master/kran/helikopter" — alle brukervendte labels er allerede norske;
  kun interne (ikke UI-viste) field-keys er på engelsk.
- **Ikke gjort** (tidsbegrenset, lavest prioritert i planen): native
  valideringsmeldinger på norsk, ett konsekvent datoformat overalt,
  signaturfelt rask-strøk/tom-signatur-sperre (kunne ikke verifisere
  pointer-oppførsel uten fysisk enhet), avvik-kvittering, mobil
  FAB-samlemeny, kom-i-gang-fremdriftssporing, `?_rsc=`-prefetch-opprydning,
  Supabase realtime-reconnect-backoff.

## Regresjonstester som følger med

Alle under `scripts/qa/`, kjørbare enkeltvis (`npm run test:<navn>`) eller
samlet (`npm test`, som også kjører de eksisterende `test:tokens`):

| Script | Dekker |
|---|---|
| `golden-pdf-checkboxes.ts` | Punkt 1 |
| `golden-pdf-metadata.test.ts` | Punkt 3 |
| `golden-pdf-font.test.ts` | Punkt 4 |
| `ai-error-handling.test.ts` | Punkt 2 |
| `chunk-error.test.ts` | Punkt 5 |
| `samsvar-signing-role.test.ts` | Punkt 6 |
| `required-fields.test.ts` | Punkt 8 |
| `admin-rbac.test.ts` | Punkt 10 |

`test:isolation` og `test:e2e` (Playwright) er IKKE del av `npm test` —
begge krever en kjørende app + database, i tråd med miljønotatet om å
ikke skrive til produksjon fra tester.
