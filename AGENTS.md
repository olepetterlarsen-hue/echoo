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
4. E2E-suiten — må passere (se under).

Nye features SKAL ha E2E-dekning. Når du legger til eller endrer en feature, skriv eller
utvid E2E-tester som dekker hovedflyten før du deployer — f.eks. signup → onboarding →
opprett kunde/anlegg/prosjekt → registrer avvik → opprett og signer skjema → last opp
kompetansebevis. En feature regnes ikke som ferdig før E2E-testen for den er grønn.

> Merk: Per nå finnes ingen E2E-suite i repoet (kun `test:isolation`). Sett opp Playwright
> og et `npm run test:e2e`-script med de kritiske brukerflytene. Inntil det er på plass er
> dette et åpent punkt som må lukkes før produksjonslansering.
