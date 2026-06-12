# Echoo launch runbook

Sjekkliste for å gå fra commit til kunde i prod. Skal kjøres i rekkefølge.

---

## 1. Klargjør Supabase

1. Nytt Supabase-prosjekt (region eu-north-1 / eu-west-1).
2. SQL Editor — kjør alle migrasjoner i rekkefølge `001…043`. Verifiser at hver kjører uten error. (Migration 040 må kjøre _etter_ 039 og _før_ 041/042/043.)
3. Hent fra **Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (hold hemmelig)
4. Generer encryption-key:
   ```sh
   openssl rand -base64 32
   ```
   Lagre som `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.

### Backup / PITR

1. **Database → Backups**: bekreft at daglige backups er aktive (default på Pro+).
2. Aktiver **Point-in-Time Recovery** (Pro-plan minimum). Sett retention til ≥ 7 dager.
3. Test restore én gang i staging: pek på et tidspunkt 1 t tilbake, opprett en read-only clone, verifiser data.

---

## 2. Kjør tenant-isolasjonstest

Mot et frisk Supabase-prosjekt med kun migrasjonene kjørt (ingen seed-data):

```sh
npm run test:isolation
```

Forventet: alle assertions OK. Hvis noen feiler → ikke ship.

---

## 3. Sentry (valgfritt, men sterkt anbefalt før prod)

```sh
npm install @sentry/nextjs
```

Sett `SENTRY_DSN` (og evt. `NEXT_PUBLIC_SENTRY_DSN`) i Netlify. `instrumentation.ts` og `lib/observability.ts` plukker det opp automatisk. Test ved å throwe en bevisst feil i en server action og bekrefte at den dukker opp i Sentry.

---

## 4. Manuell E2E-walkthrough

Kjør hele lifecycle på prod-Netlify før annonsering. Skal ta < 30 min. Bruk to forskjellige browser-profiler for å simulere to brukere.

### A. Signup → org → onboarding
- [ ] `/signup` med ny bedrift. Få bekreftet via Supabase-bruker opprettes med admin-rolle og organization_id.
- [ ] Landet på `/onboarding`. Klikk gjennom alle tre stegene (innstillinger, bedrift, brukere).
- [ ] `/admin/bedrift`: last opp logo. Bekreft at den vises i sidebar.

### B. Invitere bruker
- [ ] `/admin/brukere`: opprett medarbeider (rolle elektriker). Få midlertidig passord.
- [ ] Logg inn som ny bruker (annen browser-profil). Verifiser at dashboard viser org-data (ikke andres).
- [ ] Verifiser at brukeren har `organization_id` satt i Supabase-`profiles`-tabellen.

### C. Core lifecycle
- [ ] Som admin: opprett kunde under `/kunder/ny`.
- [ ] Opprett site under `/sites/ny` knyttet til kunden.
- [ ] Opprett prosjekt under `/prosjekter/ny`.
- [ ] Registrer avvik på prosjektet. Tildel til medarbeideren.
- [ ] Som medarbeider: bekreft at avviket vises i `/mine-oppgaver`.
- [ ] Lukk avviket. Bekreft `/dashboard` count går ned.

### D. Dokumenter
- [ ] Som admin: signaturpad i `/profil` → tegn og lagre.
- [ ] På et prosjekt: opprett risikovurdering → fyll inn → signer. PDF skal lastes ned eller vises.
- [ ] Verifiser i `documents`-bucket at PDF eksisterer på `{project_id}/risikovurdering/v1-*.pdf`.

### E. Kompetanse
- [ ] `/kompetanse`: last opp et sertifikat (PDF). Sett utløpsdato.
- [ ] Verifiser i `certificates`-bucket at fila er på `{profile_id}/...`.
- [ ] Bekreft at "utløper snart"-badgen vises i `/mine-oppgaver` hvis innen 90 dager.

### F. Stoffkartotek
- [ ] `/stoffkartotek/ny`: opprett ny stoffkartotek-entry, last opp SDS.
- [ ] Verifiser at SDS-fila er på `{org_id}/...` i `substance-sds`-bucket.

### G. E-postvarsler (Resend)
- [ ] Tildel oppgave til medarbeider med varsling påslått. Skal motta e-post fra `EMAIL_FROM` via Resend.
- [ ] Sjekk `email_log`-tabellen for status.
- [ ] Hvis e-post ikke kommer: sjekk Resend dashboard og bekreft at `RESEND_API_KEY` er korrekt og `EMAIL_FROM` er verifisert domene.

### H. Dashboard counts
- [ ] `/dashboard` viser riktige tall for prosjekter, kunder, sites, avvik, dokumenter.
- [ ] Logg inn som medarbeider i annen org. Bekreft at counts er 0 / kun ser egen org.

---

## 5. Lighthouse

Kjør Lighthouse-audit (Chrome DevTools) på `/login` og `/dashboard` etter innlogging. Mål:
- Performance ≥ 90
- Accessibility ≥ 95
- Best practices ≥ 95
- SEO (kun /login og marketing-pages) ≥ 95

---

## 6. Final checklist før annonsering

- [ ] HTTPS aktivert med valid sertifikat (Netlify gjør dette automatisk).
- [ ] Tenant-isolasjonstest passerer (siste kjøring < 24 t gammel).
- [ ] Sentry mottar events.
- [ ] PITR aktiv med ≥ 7 dager retention.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` er IKKE i klient-bundle (sjekk Network-tab).
- [ ] Robots/SEO: `/signup` indeksbar, `/admin/*` har `noindex`.
- [ ] Rate limit testet: 6 forsøk på `/signup` fra samme IP → den 6. blokkeres.
