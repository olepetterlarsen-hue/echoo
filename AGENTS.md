<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Arbeidsflyt: alltid E2E-test før deploy

Før enhver deploy til produksjon — og før push til `main` som trigger deploy — skal hele
testsuiten kjøres og være grønn. Deploy aldri med feilende eller hoppede tester.

Obligatorisk før deploy:
1. `npm run lint` — ingen feil.
2. `npm run build` — må bygge rent.
3. `npm run test:isolation` — tenant-isolasjon (org A skal aldri se org B sine data) må passere.
4. `npm run test:e2e` — Playwright-suiten må passere (se under).

Nye features SKAL ha E2E-dekning. Når du legger til eller endrer en feature, skriv eller
utvid E2E-tester som dekker hovedflyten før du deployer — f.eks. signup → onboarding →
opprett kunde/anlegg/prosjekt → registrer avvik → opprett og signer skjema → last opp
kompetansebevis. En feature regnes ikke som ferdig før E2E-testen for den er grønn.

## E2E-oppsett (Playwright)

- Konfig: `playwright.config.ts`. Tester ligger i `e2e/`. Kjør med `npm run test:e2e`.
- `e2e/global-setup.ts` lager en fersk test-organisasjon + admin (med signatur) via
  service_role mot Supabase og skriver credentials til `e2e/.auth/creds.json`
  (gitignorert). `e2e/global-teardown.ts` sletter orgen etterpå (cascade rydder data).
- `e2e/auth.setup.ts` er et "setup"-prosjekt som logger inn via UI og lagrer sesjonen til
  `e2e/.auth/admin.json` (storageState). Øvrige tester gjenbruker den innloggede sesjonen.
- Webserver startes automatisk av Playwright (`npm run build && npm run start`).
- Testene treffer samme Supabase som `test:isolation`; all test-data er merket `e2e-*` og
  ryddes bort. Krever `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` og
  `SUPABASE_SERVICE_ROLE_KEY` i `.env.local`.
- Dekker i dag: auth-guard (redirect uinnlogget), innlogging, dashboard/prosjektliste,
  opprett kunde. Utvid mot avvik → skjema-signering → kompetansebevis etter hvert.
