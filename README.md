# Echoo

Kvalitets- og prosjektstyring for elektroentreprenører. Multi-tenant SaaS — hver bedrift får sin egen organisasjon med isolert data, egen logo, egne maler.

Forked fra OPCOM IKK (`~/Projects/opcom-elektro-kvalitet`) og gjort generisk. Hovedforskjeller:
- Multi-tenant (organizations + RLS per org)
- Public signup-flow (`/signup`)
- Per-bedrift settings: logo, branding, bedriftsinfo (`/admin/bedrift`)
- Generisk brand → admin/bedrift styrer alt

---

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **React 19** + Tailwind v4
- **Supabase** (Postgres, Auth, Storage)
- **Anthropic Claude API** (for AI-mal-generator)
- **Resend** (e-postvarsler, valgfritt)
- **Netlify** (hosting + auto-deploy fra GitHub)

---

## 🚀 Førstegangs-oppsett (steg-for-steg)

### 1. Lag GitHub-repo

```bash
cd ~/Projects/echoo
gh repo create echoo --private --source=. --remote=origin
git add -A
git commit -m "Initial Echoo commit fra OPCOM-fork"
git push -u origin main
```

(Hvis du ikke har `gh`-CLI: lag repo manuelt på github.com, så `git remote add origin ...` + push.)

### 2. Opprett nytt Supabase-prosjekt

1. Gå til [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → navn: `echoo`, region: `eu-west-1` eller `eu-central-1`
3. Velg sterkt DB-passord, lagre det i passord-manager
4. Vent på provisjonering (~2 min)

### 3. Kjør database-migrasjoner

I Supabase: **SQL Editor** → **New query** → kjør hver fil i rekkefølge fra `supabase/migrations/`:

```
001_initial_schema.sql
002_storage_buckets.sql
...
039_echoo_multi_tenant.sql          ← KRITISK: gjør systemet multi-tenant
```

Du kan kjøre alle på en gang ved å lime inn samlet, eller én og én. **Migration 039 må kjøres sist** — den legger til `organizations`-tabellen, `organization_id` på alle data-tabeller, og rewriter RLS.

### 4. Sett env-variabler

```bash
cp .env.example .env.local
```

Fyll inn fra Supabase **Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (under "Project API keys" → service_role, hold hemmelig!)

Valgfrie:
- `ANTHROPIC_API_KEY` for AI-mal-bygger
- `RESEND_API_KEY` + `EMAIL_FROM` for e-postvarsler

Generer encryption-key for stabile server-action ID-er:
```bash
openssl rand -base64 32
```
Lagre under `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.

### 5. Test lokalt

```bash
npm install
npm run dev
```

- Gå til [http://localhost:3000/signup](http://localhost:3000/signup)
- Lag en test-bedrift
- Du blir admin og lander på `/onboarding`
- Test å fylle inn bedrifts-info (`/admin/bedrift`), opprette prosjekt, signere et dokument

### 6. Netlify-deploy

1. Logg inn på [Netlify](https://app.netlify.com)
2. **Add new site** → **Import from Git** → koble til echoo-repoet
3. Build command: `npm run build`. Publish directory: `.next`
4. Add environment variables (alle fra `.env.local` + `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`)
5. Deploy → Netlify gir deg en `*.netlify.app`-URL
6. Når du er klar: koble til echoo.no under **Domain settings**

---

## 📁 Mappestruktur

```
src/
├── app/
│   ├── (app)/                  Innloggede sider (krever auth + org)
│   │   ├── admin/
│   │   │   ├── bedrift/        Org-settings (logo, branding, info)
│   │   │   ├── brukere/        Bruker-admin
│   │   │   ├── maler/          Dokumentmal-bygger (+ AI)
│   │   │   └── ...
│   │   ├── dashboard/
│   │   ├── onboarding/         Velkomstwizard etter signup
│   │   ├── produksjonsplan/    Gantt med seksjoner
│   │   └── ...
│   ├── login/
│   ├── signup/                 Public signup-flow
│   └── layout.tsx              Echoo-branding (metadata, favicon)
├── components/
│   └── app/
│       ├── app-shell.tsx       Sidebar + topbar
│       ├── report-issue-button.tsx  Flytende "Rapporter problem"
│       └── ...
├── lib/
│   ├── i18n/                   no/en med cookie-basert locale
│   ├── org-settings.ts         getCurrentOrgSettings() (multi-tenant)
│   ├── geocode.ts              Nominatim-helper
│   └── ...
└── supabase/migrations/
    └── 039_echoo_multi_tenant.sql   Multi-tenant transform
```

---

## 🏗 Arkitektur

### Multi-tenant data isolation

Hver bedrift = én rad i `organizations`-tabellen. Alle data-tabeller har `organization_id` FK. RLS-policies bruker `current_organization_id()`-funksjon for å filtrere alt automatisk.

```sql
-- Eksempel: prosjekter er kun synlige for egen org
create policy projects_org_isolation on public.projects
  for all
  using (organization_id = public.current_organization_id())
  with check (organization_id = public.current_organization_id());
```

### Signup-flow

1. `/signup` viser skjema (bedriftsnavn, org.nr, admin-bruker)
2. Server action `signUpOrganization` kaller `supabase.auth.admin.createUser` (auto-bekreftet i beta)
3. Kaller deretter `signup_organization` RPC (security definer) som:
   - Oppretter `organizations`-rad
   - Setter profile.role = 'admin' og profile.organization_id på nye brukeren
4. Signer inn brukeren med vanlig auth, redirect til `/onboarding`

### Branding

- Default Echoo wordmark (`public/echoo-wordmark.svg`)
- Hver org kan laste opp egen logo via `/admin/bedrift`. Lagres i `org-logos`-bucket, path = `<orgId>/logo-<timestamp>.<ext>`
- `primary_color` på organizations-raden brukes som accent (default `#F47920`)

### AI-mal-bygger

Eksisterer i `/admin/maler/ny` (custom templates) og `/admin/maler/custom/[id]`. Bruker Claude Haiku 4.5 via `ANTHROPIC_API_KEY`.

**Kjent begrensning (TODO):** AI-generatoren støtter foreløpig kun custom-templates. For å regenerere kanoniske typer (Risikovurdering, Sluttkontroll, RUH osv.) må admin enten: (a) redigere manuelt i `/admin/maler/[kind]`, eller (b) lage en custom template via AI og bytte den ut.

---

## 🌍 Internasjonalisering

Cookie-basert (`opcontrol-locale=no|en`). Server Components leser via `getServerT()`. Klient-komponenter via `useLocale()` + `tr(key, locale)`. Bytting av språk kaller `router.refresh()`.

Strings er fordelt i `src/lib/i18n/strings/`:
- `common.ts` — nav, knapper, verdier
- `dashboard.ts`, `auth.ts`, `admin.ts`, `planner.ts`, `quality.ts`, `projects.ts`

---

## 📋 Roadmap (etter MVP)

- [ ] Stripe Billing (per-org abonnement) når beta er over
- [ ] AI-generator for kanoniske dokumenttyper (ikke bare custom)
- [ ] Offline-modus (PWA + IndexedDB) for mobil i tunneler
- [ ] Invite-flow via e-post (i stedet for at admin må sette midlertidig passord)
- [ ] Custom domener per kunde (`<kunde>.echoo.no`)
- [ ] Marketing-site på `echoo.no` (separat repo/stack)

---

## 🐛 Vanlige problemer

**"Server Action ... was not found"** etter Netlify-deploy → mangler `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`. Hard-refresh nettleseren én gang, deretter sett env-en.

**Signup feiler stille** → sjekk at `SUPABASE_SERVICE_ROLE_KEY` er satt (signup bruker admin-API for å opprette bekreftede brukere).

**Brukere ser ingen data etter innlogging** → bekreft at migration 039 har kjørt, og at profilet har `organization_id` satt. Sjekk i Supabase **Authentication → Users** og **Database → Tables → profiles**.

**Logo vises ikke etter opplasting** → bekreft at `org-logos`-bucket finnes og er public (skapt automatisk av migration 039). Kan sjekkes i Supabase **Storage → Buckets**.

---

## 📝 Lisens

Privat — alle rettigheter forbeholdt.
