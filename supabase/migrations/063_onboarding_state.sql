-- 063_onboarding_state.sql
-- Per-bruker onboarding-progress. AI-assistenten ("Kom-i-gang"-skillen)
-- leser dette ved hver tur og foreslår neste steg basert på hvor brukeren
-- er — og hva som faktisk er gjort i appen (vi sjekker f.eks. om brukeren
-- har opprettet kunder før vi markerer steg "kunde-registrering" fullført).

create table if not exists public.onboarding_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  -- ID på siste steg brukeren jobbet med
  current_step text,
  -- Hvilke steg er markert fullført (kan også derives fra app-data,
  -- men cachen unngår heavy joins ved hver "tur" i samtalen)
  completed_steps text[] not null default '{}',
  -- Når assistenten sist hjalp denne brukeren
  last_helped_at timestamptz,
  -- Fritekst notater fra/til assistenten (hva brukeren har sagt om
  -- bransje, mål, smerter — gir personlig tone i samtalen)
  notes text,
  -- Når brukeren markerte onboarding helt ferdig (eller "skipped")
  finished_at timestamptz,
  -- Antall meldinger utvekslet i kom-i-gang-skillen
  messages_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create trigger trg_onboarding_state_updated before update on public.onboarding_state
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.onboarding_state enable row level security;

-- Brukeren ser/oppdaterer kun sin egen onboarding-state
drop policy if exists onboarding_state_select on public.onboarding_state;
create policy onboarding_state_select on public.onboarding_state
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists onboarding_state_insert on public.onboarding_state;
create policy onboarding_state_insert on public.onboarding_state
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_active());

drop policy if exists onboarding_state_update on public.onboarding_state;
create policy onboarding_state_update on public.onboarding_state
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists onboarding_state_delete on public.onboarding_state;
create policy onboarding_state_delete on public.onboarding_state
  for delete to authenticated
  using (user_id = auth.uid());
