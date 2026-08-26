# Echoo — forslag til oppdatering før launch

Basert på QA-gjennomgangen 19.08.2026 (F-01–F-24 fra elektrikeragenten, I-01–I-41 fra installatøragenten).
Omfang i denne runden: **alle 5 blokkere + de 7 alvorlige funnene**. Kosmetikk er listet til slutt som en egen opprydningscommit.

Planen er skrevet slik at hver seksjon kan bli én commit med egne akseptansekriterier og en regresjonstest.

**Antatt stack** (utledet fra appen — justeres når repoet er tilgjengelig): Next.js App Router med server actions, Supabase (Postgres + Auth + Storage + Realtime), `@react-pdf/renderer` for dokument-PDF, Tailwind, Anthropic API for AI-import.

---

## Rekkefølge og commit-inndeling

| # | Commit | Funn | Risiko | Estimat |
|---|---|---|---|---|
| 1 | `fix(pdf): render avkryssinger og valg i alle dokumenttyper` | B1 / I-12, I-18 | Lav | 0,5–1 d |
| 2 | `fix(ai): roter API-nøkkel, skjul upstream-feil, legg til helsesjekk` | B2 / I-29 | Lav | 2–3 t |
| 3 | `fix(pdf): korrekt status, installatørblokk, anleggsadresse og logo` | A1, A2, A4 / I-11, I-13, I-10 | Lav | 0,5 d |
| 4 | `fix(pdf): font med full tegnstøtte (Ω, Δ, µ, °, ², ³)` | A3 / I-19 | Lav | 1–2 t |
| 5 | `fix(forms): ingen submit før hydrering + error boundary for ChunkLoadError` | B3 / F-01, F-06, F-18, I-26 | **Middels** | 1–1,5 d |
| 6 | `fix(auth): signeringsrett for bemyndiget admin` | B5 / F-14 | Middels | 0,5 d |
| 7 | `feat(docs): bildevedlegg på dokumenter, med kamera på mobil` | B4 / F-15, I-25 | **Høy** (ny modell + lagring) | 2–3 d |
| 8 | `fix(sign): håndhev obligatoriske felt før signering` | A5 / I-39 | Lav | 0,5 d |
| 9 | `feat(auth): tvungen bytte av midlertidig passord + endre passord i profil` | A6 / I-01, F-23 | Middels | 1 d |
| 10 | `fix(rbac): rollesjekk på alle /admin-ruter og import-endepunkter` | A7 / I-04, I-28, I-29 | Lav | 0,5 d |
| 11 | `chore(i18n+ui): norske valideringsmeldinger, 404, rollenavn, datoformat, maler` | kosmetikk | Lav | 0,5 d |

Sum ≈ 8–10 arbeidsdager for én utvikler. Commit 1–4 alene fjerner det som faktisk stopper launch og kan være ute samme dag.

---

## 1. Avkryssinger må rendres i PDF  ·  BLOKKER B1

**Symptom.** Ja/Nei/Uakt.-kolonnene er tomme i risikovurdering (19 spm) og sluttkontroll (29 spm). I samsvarserklæringen listes «Type endring», «Type arbeid» og «Type spenning» som ren tekst uten markering. Fritekst og måleverdier kommer derimot med — det er kun selve avkryssingen som ikke rendres.

**Sannsynlig årsak.** PDF-komponenten mapper `question.options` til `<Text>` uten å slå opp mot `answer.value`, eller den forsøker å skrive et glyph (☒/☑) som fonten ikke har (samme rot som Ω-feilen i punkt 4). Én av delene forklarer at *alle* avkryssinger er blanke mens tekst er intakt.

**Foreslått fiks.** Ikke bruk glyph. Tegn boksen med primitiver, som er fontuavhengig:

```tsx
// components/pdf/Checkbox.tsx
const Checkbox = ({ checked }: { checked: boolean }) => (
  <View style={{ width: 9, height: 9, borderWidth: 1, borderColor: '#1d1c1a',
                 marginRight: 5, alignItems: 'center', justifyContent: 'center' }}>
    {checked && <View style={{ width: 5, height: 5, backgroundColor: '#1d1c1a' }} />}
  </View>
)
```

Bruk den samme komponenten for alle valgtyper: `radio`, `checkbox`, `yes_no`, `yes_no_na`, RUH-kategori og RUH-alvorlighet. For Ja/Nei/Uakt.-tabellen rendres tre celler med `<Checkbox checked={answer === 'ja'} />` osv.

**Akseptansekriterier**

- [ ] Et signert dokument med «400V AC» avkrysset gir PDF-tekst som entydig viser valget (☒-boksen er fylt, og tekstuttrekk viser `[X] 400V AC`).
- [ ] Ja/Nei/Uakt. er markert for hvert spørsmål i risikovurdering og sluttkontroll.
- [ ] Ubesvarte spørsmål viser tre tomme bokser — ikke en tilfeldig markering.
- [ ] Gjelder alle fem dokumenttyper: samsvarserklæring, risikovurdering, sluttkontroll, RUH, oppstartssjekkliste.

**Test.** Golden-test: generer PDF fra en fixture med kjente svar, kjør `pdf-parse` og assert at strengen for hvert avkrysset alternativ inneholder markøren, og at antall markører = antall besvarte spørsmål. Kjøres i CI.

---

## 2. AI: ugyldig API-nøkkel og lekket upstream-feil  ·  BLOKKER B2

**Symptom.** Sluttbruker får ordrett:
`401 {"type":"error","error":{"type":"authentication_error","message":"API key is invalid."},"request_id":null}`

**Fiks, tre deler.**

1. **Roter nøkkelen** i produksjonsmiljøet (`ANTHROPIC_API_KEY`). Verifiser at prod, preview og lokal bruker hver sin nøkkel, og at prod-nøkkelen ikke er en utløpt dev-nøkkel.
2. **Aldri vis upstream-feil.** Logg full feil server-side med request-id, returner en norsk melding til klienten:
   > «AI-tjenesten er utilgjengelig akkurat nå. Prøv igjen om litt, eller registrer dokumentet manuelt.»
   Ingen leverandørnavn, statuskoder eller JSON i UI.
3. **Helsesjekk.** `GET /api/health/ai` som gjør et minimalt kall og returnerer `{ ok: boolean }`. Skjul eller merk AI-knappene når den svarer `false`, i stedet for å la brukeren møte feilen først etter opplasting. Legg helsesjekken i deploy-pipelinen som en smoke-test.

**Akseptansekriterier**

- [ ] AI-import fullfører på en gyldig PDF i produksjon.
- [ ] Ved simulert 401 vises kun den norske meldingen; ingen del av upstream-svaret finnes i DOM-en.
- [ ] Deploy feiler eller varsler hvis `/api/health/ai` svarer `ok: false`.

---

## 3. PDF: status, installatørblokk, anleggsadresse og logo  ·  A1, A2, A4

**Symptomer.** Signerte PDF-er sier `Status: Utkast` rett over `Signert: 19.08.2026`. Installatør/bemyndiget person (FEL § 12) mangler helt, likeså anleggsadresse og kunde. Logoen er ikke embeddet — bare teksten «SØRBY».

**Fiks.**

- **Status:** PDF-en genereres tydeligvis fra dokumentobjektet før statusovergangen, eller fra en default. Generer PDF *etter* at `status = 'signed'` er committet, og send status eksplisitt inn i renderen. Vis `Status: Signert · v1` og fjern «Signert»-linjen som duplikat.
- **Installatørblokk:** ny seksjon nederst, før signatursiden, som henter fra `organizations`: virksomhetens navn, org.nr, adresse, og *ansvarlig installatør / bemyndiget person* med navn og rolle. Merk seksjonen med FEL § 12-referansen. Feltene finnes allerede i Innstillinger → Bedrift — de brukes bare ikke.
- **Anlegg:** anleggsadresse, site-ID og kunde inn i topplokken. Er site tom, arv adressen fra kunden på prosjektet. En samsvarserklæring uten anleggsidentifikasjon er ikke gyldig dokumentasjon.
- **Logo:** hent logoen fra Supabase Storage server-side, konverter til buffer og send som `<Image src={buffer} />` i `@react-pdf`. Signerte URL-er er upålitelige i renderkonteksten. Fallback til dagens tekstvariant hvis nedlasting feiler, og logg det.
- Fjern «Statistikk»-boksen (intern malmetadata) fra kundevendte dokumenter, eller flytt den til en intern side. Fiks samtidig tellingen — 19 spørsmål ble vist som «8 spørsmål» (I-20).

**Akseptansekriterier**

- [ ] Ingen signert PDF inneholder ordet «Utkast».
- [ ] Samsvarserklæringen viser installatør/bemyndiget, org.nr og anleggsadresse.
- [ ] Logoen vises øverst i PDF når den er lastet opp, og i sidemenyen i appen (F-20).
- [ ] «Totalt antall spørsmål» stemmer med faktisk antall, eller er fjernet.

---

## 4. PDF-font med full tegnstøtte  ·  A3

**Symptom.** `0,12 Ω` blir `0,12 ©`. Rammer et elektrofaglig produkt direkte: isolasjonsmåling, kontinuitet og overgangsmotstand skrives alle med Ω.

**Fiks.** Registrer én font med god Unicode-dekning i `@react-pdf/renderer` og bruk den for hele dokumentet:

```ts
Font.register({ family: 'NotoSans', fonts: [
  { src: path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf') },
  { src: path.join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf'), fontWeight: 700 },
]})
```

Legg fontfilene i repoet (ikke hentet over nett ved render). Sjekk samtidig at lange verdier ikke flyter ut av cellen (`>500 MΩ @ 500 V` klippes i dag) — sett `flexShrink: 1` og `wrap` på verdicellen.

**Akseptansekriterier**

- [ ] Testdokument med `Ω Δ µF °C m² m³ ± ø æ å` rendres korrekt; assert på uttrukket tekst i CI.
- [ ] Verdier på 30+ tegn brytes i stedet for å flyte over cellekanten.

---

## 5. Skjemaer må ikke kunne submittes før hydrering  ·  BLOKKER B3

**Symptom.** Klikker man lagre før React er hydrert, gjør nettleseren en tom native GET-submit (`GET /kunder/ny?`), skjemaet blir blankt, ingenting lagres og **ingen** feilmelding vises. Reprodusert på `/signup`, `/kunder/ny`, `/prosjekter/ny` og `/kompetanse` — der forsvant 4 av 5 opplastede kursbevis. Rot: `ChunkLoadError` + React #418 (hydreringsmismatch), og at `<form>` mangler `name` på inputfeltene så en native submit sender ingenting.

**Fiks, fire deler.**

1. **Progressive enhancement.** Bruk server actions direkte på `<form action={serverAction}>` og gi alle felt `name`. Da fungerer skjemaet *også* uten JS, i stedet for å bli et tomt GET-kall.
2. **Blokker submit til appen er klar.** En liten `useHydrated()`-hook, og submit-knappen får `disabled={!hydrated}` med teksten «Laster …». Fjerner hele feilklassen uansett rotårsak.
3. **Error boundary for chunk-feil.** Global `error.tsx` som fanger `ChunkLoadError` og gjør én automatisk reload (vokterflagg i `sessionStorage` så det ikke looper), ellers viser «Noe gikk galt — last siden på nytt».
4. **Finn hydreringsmismatchen.** React #418 kom på *hver* lasting av `/prosjekter/ny`. Typisk årsak: `new Date()`, `Math.random()`, `localStorage` eller `toLocaleDateString()` i render. Kjør en dev-build og fiks den konkrete komponenten — dette er selve rotårsaken bak at chunkene ikke hydrerer.

**Akseptansekriterier**

- [ ] Playwright-test: klikk «Opprett» 0 ms etter `domcontentloaded` → enten lagres dataene, eller knappen er deaktivert. Skjemaet skal aldri bli blankt uten melding.
- [ ] Ingen React #418 i konsollen på `/prosjekter/ny`, `/kunder/ny`, `/signup`, `/kompetanse`.
- [ ] Simulert 404 på en JS-chunk gir synlig feilmelding, ikke et dødt skjema.

---

## 6. Bemyndiget admin må kunne signere  ·  BLOKKER B5

**Symptom.** `Kun Installatør eller Bemyndiget kan signere Samsvarserklæring`. Den som registrerer bedriften blir Admin — og Admin kan ikke signere. En enmannsbedrift kommer ikke i mål.

**Fiks.** Skill *systemrolle* fra *faglig rolle*. Minste inngrep som løser det riktig:

- Legg `is_bemyndiget boolean` på `users` (eller `qualifications jsonb`), og sett den automatisk for brukeren som er valgt som «Installatør / bemyndiget person» i Innstillinger → Bedrift.
- Signeringsregelen blir: `role in ('installator','bemyndiget') || user.is_bemyndiget`.
- I onboarding: la den som registrerer bedriften krysse av «Jeg er registrert installatør / bemyndiget person» — da er eieren signeringsklar fra dag én.
- Behold sperren ellers. Poenget er ikke å åpne opp, men at rollen ikke skal låse eieren ute.

**Akseptansekriterier**

- [ ] Ny bedrift → eier kan signere en samsvarserklæring uten å endre sin egen rolle.
- [ ] En montør uten flagget får fortsatt `disabled` knapp og forklarende tekst.
- [ ] Regelen håndheves server-side, ikke bare i UI.

---

## 7. Bildevedlegg på dokumenter  ·  BLOKKER B4

**Symptom.** `input[type=file]` = 0 på 19 sider. En montør kan ikke dokumentere sikringsskap, kursfortegnelse eller jordfeiltest med bilde noe sted. For et kvalitetssystem for elektrikere er dette kjerneleveransen.

**Fiks (største jobben — vurder egen PR).**

- **Datamodell:** `document_attachments (id, document_id, question_id nullable, storage_path, filename, mime, size, taken_at, uploaded_by, created_at)`. `question_id` gjør at bildet kan henge på et konkret sjekkpunkt, ikke bare på dokumentet.
- **Lagring:** egen Supabase Storage-bucket `document-attachments` med RLS: kun medlemmer av samme organisasjon får lese; skriving kun for den som eier dokumentet eller har prosjekttilgang.
- **Opplaster:** komponent med `accept="image/*"` og `capture="environment"` (åpner kamera direkte på mobil), klientside-komprimering til maks ~1600 px / ~300 kB før opplasting, miniatyrvisning, slett-knapp, og opplasting i bakgrunnen med synlig fremdrift. Feilende opplasting **må** gi feilmelding — det er nettopp den stille feilen i I-26.
- **Plassering:** «Legg til bilde» per sjekkpunkt i sluttkontroll og risikovurdering, og en «Vedlegg»-seksjon på dokumentnivå for samsvarserklæring, RUH og avvik.
- **PDF:** nytt kapittel «Vedlegg — bilder» med to bilder per side, bildetekst `Kursfortegnelse — sjekkpunkt 4.2 — 19.08.2026`. Bildene låses sammen med dokumentet ved signering.
- **Offline:** en montør i kjeller har ikke nett. Køopplasting i `IndexedDB` med retry er riktig løsning, men kan tas som fase 2 — da må UI-et i det minste si tydelig fra at bildet ikke er lastet opp ennå.

**Akseptansekriterier**

- [ ] Fire bilder kan lastes opp på ett dokument fra både desktop og mobil, og overlever ny sidelast.
- [ ] Bildene er med i PDF-en etter signering, med bildetekst.
- [ ] Feilet opplasting gir synlig feilmelding og lar brukeren prøve på nytt.
- [ ] Bruker i annen organisasjon får 403 på storage-objektet (RLS-test).

---

## 8. Obligatoriske felt må håndheves ved signering  ·  A5

**Symptom.** Oppstartssjekklisten lot seg signere og låse med `Bilens registreringsnummer *` tomt. I PDF-en står feltet som «–».

**Fiks.** Valider server-side i signeringsactionen: samle alle `required`-felt uten verdi, avbryt, og returner listen. UI viser «Kan ikke signeres — 3 obligatoriske felt mangler» med lenker som scroller til feltene. Samme validering i klienten for rask tilbakemelding, men serveren er fasit.

**Akseptansekriterier**

- [ ] Signering med tomt obligatorisk felt avvises med liste over hva som mangler.
- [ ] Direkte POST mot signeringsendepunktet avvises på samme måte.

---

## 9. Passord: tvungen bytte og «Endre passord»  ·  A6

**Symptom.** Admin oppretter bruker med et midlertidig passord som formidles på SMS eller muntlig. Ved første innlogging kommer ingen melding, og `/profil` har ikke «Endre passord» — eneste vei er «Glemt passord?».

**Fiks.**

- `must_change_password boolean default true` når admin oppretter bruker med midlertidig passord. Middleware sender brukeren til `/profil/nytt-passord` til flagget er ryddet.
- Legg «Endre passord» i `/profil` (krev gjeldende passord).
- **Anbefalt i tillegg:** ekte invitasjon på e-post med engangslenke (Supabase `inviteUserByEmail`), slik at admin aldri trenger å finne på et passord. Det fjerner F-23 samtidig, og ordet «Inviter» i onboardingen blir sant.

**Akseptansekriterier**

- [ ] Ny bruker med midlertidig passord tvinges gjennom passordbytte før hun når dashbordet.
- [ ] Passord kan byttes fra profilen.
- [ ] Invitasjonslenke sendes på e-post og utløper (om invitasjonsflyten tas med).

---

## 10. Rollesjekk på alle /admin-ruter  ·  A7

**Symptom.** `/admin/import-wizard` og `/admin/bulk-import` gir HTTP 200 for Installatør. Admin-malen (xlsx med fanen «Brukere» og kolonnen `role`) lastes ned uten hinder, og hele forhåndsvisningen kjører — først på «Importer alt» stopper serveren med `{"error":"Kun admin kan invitere brukere."}`. AI-import laster derimot filen faktisk opp til organisasjonens lagring uten rollesjekk.

**Fiks.**

- Rollesjekk i `middleware.ts` for hele `/admin/*` — ikke i hver enkelt side, og ikke bare i menyen.
- Samme sjekk i alle route handlers og server actions under admin, inkludert `GET /admin/bulk-import/template` og opplastingen i import-wizarden.
- Ikke-admin skal møte sperren *før* hun fyller ut et helt regneark.
- Rydd samtidig i `/kompetanse`: at «du kan laste opp på vegne av enhver bruker» (I-27) bør begrenses til admin eller kreve godkjenning fra den det gjelder — ellers er kompetansedokumentasjonen ikke etterrettelig ved tilsyn.

**Akseptansekriterier**

- [ ] Alle `/admin/*`-ruter redirigerer ikke-admin til `/dashboard`.
- [ ] `GET /admin/bulk-import/template` gir 403 for ikke-admin.
- [ ] Opplasting i import-wizarden avvises for ikke-admin *før* filen skrives til storage.
- [ ] Integrasjonstest per rolle (montør, elektriker, installatør, admin) over adminendepunktene.

---

## 11. Opprydning — språk, maler og småting

Én commit, lav risiko, stor effekt på inntrykket:

- Norske valideringsmeldinger i stedet for nettleserens engelske (`Please fill out this field.`) — bruk egne meldinger med `setCustomValidity` eller skjemabibliotek.
- 404-siden på norsk (`This page could not be found.`).
- «Installator» → «Installatør» (rå API-verdi vises i meny og profil), og «Administrator»/«Admin» konsekvent.
- Ett datoformat: `19.08.2026` overalt, også i PDF (i dag tre varianter).
- Signaturfeltet: registrer raske streker (pointer-events med `setPointerCapture`), og **nekt å lagre en tom signatur** i stedet for å vise «✓ Lagret».
- Avvik: vis kvittering og naviger etter lagring — i dag står knappen på «Lagrer…» selv om serveren svarte 200 (I-33). Duplikatfare.
- Mobil: gi de tre flytende knappene en samlet meny, eller `padding-bottom` på innholdet, så de slutter å dekke kort og knapper.
- Rydd malinnholdet: «Er det anvendt Telenors sjekklister …» i sluttkontroll for bolig, og SJA-malen om master, kran og helikopter (på engelsk). Dette er det som raskest undergraver tilliten hos en elektriker som prøver produktet.
- Kom-i-gang-veilederen: spor faktisk fremdrift (viser 0/6 selv når alt er gjort), og ikke vis «Inviter en kollega» til roller som ikke har lov.
- Rydd i `?_rsc=`-prefetch (10–20 avbrutte requests per sidevisning) og legg backoff på Supabase realtime-reconnect.

---

## Regresjonstester som bør følge med

Testriggen fra QA-kjøringen kan gjenbrukes nesten som den er:

1. **PDF golden tests** (viktigst) — fixture inn, generert PDF ut, assert på uttrukket tekst: avkryssingsmarkører, status, Ω, installatørblokk, antall vedlegg.
2. **Playwright-flyt** — registrer bedrift → kunde → prosjekt → dokument → signer → last ned PDF, kjørt både på 1440×900 og 390×844.
3. **Rollematrise** — for hver rolle, assert HTTP-status på alle `/admin/*`-ruter og admin-endepunkter.
4. **Hydreringstest** — klikk submit umiddelbart etter last på de fire skjemaene.
5. **Konsollvakt** — feil testen hvis konsollen inneholder React-feil eller `ChunkLoadError` under gjennomkjøringen.

---

## Det som ikke skal endres

Verifisert at det virker, og bør stå i fred: signeringsflyten med låsing og «Ny versjon» (v1 beholdes, v2 må signeres på nytt), rollemenyen, mobiltilpasningen av skjemaene (kortbasert Ja/Nei/Uakt. er godt løst), og den norske feilmeldingen i AI-import — `AI-import støtter foreløpig kun PDF. Konverter filen og prøv igjen.` er slik feilmeldinger bør se ut ellers i appen også.
