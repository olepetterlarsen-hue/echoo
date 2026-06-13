# Claude Code prompt — Echoo launch + ISO readiness

Paste this into Claude Code in `~/Projects/echoo`. Use it as the opening prompt for a session (or split per phase — phases are independent commits).

---

You are working on Echoo, a multi-tenant SaaS (Next.js 16 App Router + Supabase RLS + Tailwind v4) for quality and project management for electrical contractors. Read CLAUDE.md and AGENTS.md first. The goal: production-ready end-to-end service within one week, and ISO 9001/14001 support as a product feature.

Work in phases. After each phase: run `npm run build` and lint, write/update tests, and commit with a descriptive message. Do not start the next phase until the current one builds clean.

## Phase 1 — Critical multi-tenant fixes (do first, in this order)

1. Server actions insert rows without `organization_id`, but RLS (migration 039) requires `organization_id = current_organization_id()` on insert — so creation flows fail. Fix both layers:
   - New migration: `before insert` trigger on every org-scoped data table that sets `organization_id := public.current_organization_id()` when NULL.
   - Also set `organization_id` explicitly in all `.insert()` calls in server actions (defense in depth). Audit every action file under `src/app/(app)/**/actions.ts`.
2. Invited users get no organization: `src/app/(app)/admin/brukere/actions.ts` + the `handle_new_user()` trigger (migration 001) never set `organization_id`. Pass the inviting admin's org_id via `user_metadata` in `admin.createUser()` and read it in the trigger. Also make `requireAdmin()` resolve and return the admin's org_id, and scope all admin actions to it.
3. Delete `src/app/api/debug-env/route.ts` (unauthenticated env exposure).
4. In `src/app/(app)/layout.tsx`: redirect to login with an error if `profile.organization_id` is NULL.
5. Add explicit `.eq("organization_id", orgId)` filters to all queries that currently rely on RLS alone (start with `src/app/(app)/dashboard/page.tsx`).
6. Rate-limit the public signup action (`src/app/signup/actions.ts`) — simple IP-based limiter in middleware or via Netlify.
7. New migration: org-scope the storage bucket policies from migration 002 (cross-check the owning profile's organization_id).
8. Write an automated tenant-isolation test: create two orgs with users and data, assert org A can never read/write org B's rows (every table) or storage objects. This test must pass before anything else ships.

## Phase 2 — End-to-end verification

Walk the full lifecycle and fix whatever breaks: public signup → org created → onboarding wizard → invite a second user → create customer, site, project → register avvik → create + sign a skjema → upload kompetanse certificate → stoffkartotek entry → dashboard counts correct. Verify emails (Resend) and PDF generation. Add error monitoring (Sentry) and confirm Supabase backups/PITR.

## Phase 3 — ISO 9001/14001 features (in this priority order, minimal but complete versions)

Echoo's customers must be able to run an ISO 9001/14001-compliant QMS/EMS in the product. Build per-org (RLS-scoped, with the Phase 1 trigger), in Norwegian UI consistent with existing modules:

1. **Document approval workflow** (ISO 9001 7.5): extend documents/skjemaer with status flow draft → under_review → approved → signed; fields approved_by/approved_at/approval_notes; reject-with-comment; change-log entry on each new version explaining why.
2. **CAPA upgrade of avvik** (10.2): add root_cause (structured categories + free text), distinguish immediate containment vs. corrective action, responsible person, due date, and a verification step (verified_by/verified_at/evidence) before an avvik can close.
3. **Internal audit module** (9.2): audit plans (scope, auditor, date, checklist), checklist templates, findings with severity — each finding can spawn a linked avvik/CAPA.
4. **Management review** (9.3): scheduled reviews with agenda; auto-pull inputs (open avvik, audit findings, KPI status, expiring certificates); record decisions and actions as oppgaver.
5. **Objectives & KPI register** (6.2, both standards): quality + environmental objectives with target, deadline, owner, progress; show on dashboard.
6. **Environmental aspects + compliance obligations** (14001 6.1.2/6.1.3): aspects register (waste, energy, emissions, chemicals — link stoffkartotek) with significance scoring; compliance obligations table (regulation, requirement, responsible, evidence link, status).

For each module: migration + RLS + insert-trigger, server actions, list/detail UI matching existing patterns (e.g. avvik), and seed templates so a new org starts with sensible ISO defaults.

## Phase 4 — Production deploy

Production env on Netlify with custom domain (SSL is automatic via Netlify/Let's Encrypt — verify HTTPS redirect + HSTS); all env vars set (never expose service-role key client-side); run all migrations on a clean Supabase project to prove reproducibility; final regression of the Phase 1 isolation test + Phase 2 E2E flow; Lighthouse pass on login/dashboard.

## Phase 5 — Security & onboarding: 2FA + AI-guided import

1. **2FA**: enable Supabase Auth MFA (TOTP). Enrollment UI under `/profil` (QR code + verify), challenge step at login. Org-level setting in `/admin/bedrift`: "require 2FA" — when on, admins must enroll before accessing the app. Use Supabase's `aal2` claim; gate sensitive admin routes on it.
2. **AI-guided import wizard** (extend `/onboarding`): the new customer uploads their existing templates and documents (PDF/docx — rutiner, skjemaer, IK-system, HMS-handbok). Use the Anthropic Claude API (already in stack for the AI mal-generator) to:
   - classify each uploaded file (rutine / skjema-mal / handbok-kapittel / stoffkartotek / kompetansebevis),
   - extract title, category, and content,
   - ask the user clarifying questions in the wizard when classification is uncertain (interactive chat-like step, Norwegian),
   - then create the corresponding org-scoped records and storage objects, and show a review screen before committing.
   Make the wizard re-runnable from `/admin` (not only first onboarding).

## Phase 6 — Billing: two tiers via Stripe

Stripe subscriptions, exactly two tiers (NOK, monthly, ex. mva):
- **Echoo Elektro + HMS**: 2 990 kr/mnd.
- **ISO 9001-modul** (add-on): +2 000 kr/mnd → 4 990 kr/mnd total. Gates the Phase 3 ISO modules (audit, management review, objectives, CAPA extras) and higher storage quota.

Implementation:
1. `subscriptions` state on `organizations` (plan, status, trial_ends_at, stripe_customer_id, stripe_subscription_id). Stripe Checkout for signup/upgrade, Customer Portal for self-service, webhook handler (`/api/stripe/webhook`) for status sync — verify webhook signatures.
2. **Trial**: 14-day free trial (full features). All data created during trial is RETAINED — on trial expiry without subscription, lock the org to read-only/paywall screen, never delete data. Reactivation on payment restores everything.
3. Feature-gating helper (server-side, not just UI) checking org plan before ISO-module actions; storage quota per tier enforced on upload.
4. Pricing page on the marketing site matching these two tiers — no other tiers.

## Phase 7 — Marketing site (`~/Projects/echoo-landing`): booking + SEO

The homepage layout/design is already done (index.html, styles.css, app.js) — do not redesign it; extend it.

1. **Booking**: embed Cal.com (free tier) so visitors book demos directly into the sales team's calendar. Prominent "Book demo" CTA in hero + nav. (Calendar account connection is done manually by the owner; just integrate the embed with a placeholder link config.)
2. **SEO (Norwegian market)** — target ranking for: `IKK`, `IK elektro`, `internkontroll elektro`, `elsikkerhet`, `internkontrollsystem`, `IK-system elektriker`, `avvikssystem elektro`, `kvalitetssystem elektriker`, `FSE dokumentasjon`, `ISO 9001 elektro`. Deliver:
   - per-page `<title>`/meta description in Norwegian with target keywords; semantic heading structure;
   - JSON-LD structured data (Organization, SoftwareApplication, FAQPage);
   - dedicated landing pages per keyword cluster (e.g. `/internkontroll-elektro`, `/elsikkerhet`, `/ikk-system`, `/iso-9001-elektro`) with substantive Norwegian copy, not thin doorway pages;
   - `sitemap.xml`, `robots.txt`, canonical URLs, Open Graph tags;
   - performance: image optimization, preloads — Lighthouse SEO + performance ≥ 95;
   - `hreflang`/lang="nb" set correctly; keep everything Norwegian for now.
3. SSL: automatic via Netlify once the custom domain is connected — verify HTTPS redirect.

## Phase 8 — Echoo AI-assistent (uke 2, etter fase 5–7)

In-app AI-assistent for kundene (Anthropic API, samme nøkkel som mal-generatoren). Bygg som chat-panel tilgjengelig i hele appen, med org-scopet kontekst (RLS gjelder — assistenten ser KUN egen orgs data, hent alltid data via brukerens Supabase-session, aldri service-role). Ferdigheter i prioritert rekkefølge:

1. **Avvik-assistent**: bruker beskriver hendelse (tekst/bilde) → utkast til avvik med alvorlighetsgrad, forslag til årsakskategori og strakstiltak/korrigerende tiltak. Bruker godkjenner før lagring.
2. **SJA/RUH-generator**: beskriv jobben → utkast til SJA med relevante farer og tiltak for elektroarbeid (FSE-momenter). Alltid review før signering.
3. **Dokument-Q&A (RAG)**: svar på spørsmål mot orgens egne rutiner, håndbok og stoffkartotek («hva sier rutinen vår om arbeid under spenning?») med kildehenvisning til dokumentet.
4. **ISO-veileder**: forklar hva ISO 9001/14001 krever i en gitt situasjon og pek på hvilken Echoo-modul som dekker det; foreslå utkast til mål, revisjonssjekklister og agenda for ledelsens gjennomgang.
5. **Mal-generator** (finnes): utvid til å foreslå forbedringer av eksisterende maler.

Regler: assistenten skriver ALLTID utkast som bruker må godkjenne — aldri direkte lagring av signerbare dokumenter; forsiktige formuleringer om forskrifter (ingen «dette er godkjent»-påstander); logg AI-genererte felt (ai_generated=true) for sporbarhet; norsk UI.

## Constraints

- Next.js 16 has breaking changes — read `node_modules/next/dist/docs/` per AGENTS.md before writing framework code.
- Never weaken an RLS policy to make a feature work; fix the data flow instead.
- All new tables: organization_id + RLS + insert-trigger from day one.
- Keep UI language Norwegian and reuse existing component patterns under `src/components/`.
- Phase 7 lives in `~/Projects/echoo-landing` (separate folder) — run that phase from a Claude Code session started in `~/Projects` or `~/Projects/echoo-landing`.
- Priority if time runs short: Phases 1–2 and 4 are non-negotiable for launch; 5.1 (2FA) and 6 (billing) before public sale; 3, 5.2 and 7 can land in week 2.
