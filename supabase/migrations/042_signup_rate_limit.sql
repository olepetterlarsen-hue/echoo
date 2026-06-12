-- 042_signup_rate_limit.sql
-- Enkel IP-basert rate limit for /signup. Tabell pluss en
-- security-definer-funksjon som server actions kan kalle med
-- service_role. Klienten ser bare ja/nei — IP-en lekker ikke.

create table if not exists public.signup_attempts (
  id bigserial primary key,
  ip_address text not null,
  email text,
  attempted_at timestamptz not null default now(),
  success boolean not null default false
);

create index if not exists idx_signup_attempts_ip_time
  on public.signup_attempts(ip_address, attempted_at desc);

create index if not exists idx_signup_attempts_email_time
  on public.signup_attempts(email, attempted_at desc)
  where email is not null;

alter table public.signup_attempts enable row level security;

-- Ingen direkte tilgang fra anon/authenticated. Service_role bypasser RLS.
revoke all on public.signup_attempts from public, anon, authenticated;

------------------------------------------------------------------
-- check_signup_rate_limit
-- Returnerer true hvis OK å fortsette, false hvis blokkert.
-- Per IP: max 5 forsøk på 1 time.
-- Per epost: max 3 forsøk på 1 time.
------------------------------------------------------------------
create or replace function public.check_signup_rate_limit(
  p_ip text,
  p_email text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip_count integer;
  v_email_count integer;
begin
  if p_ip is null or length(trim(p_ip)) = 0 then
    -- ukjent IP -> stram tolking (avvis)
    return false;
  end if;

  select count(*) into v_ip_count
  from public.signup_attempts
  where ip_address = p_ip
    and attempted_at > now() - interval '1 hour';

  if v_ip_count >= 5 then
    return false;
  end if;

  if p_email is not null and length(trim(p_email)) > 0 then
    select count(*) into v_email_count
    from public.signup_attempts
    where email = lower(trim(p_email))
      and attempted_at > now() - interval '1 hour';
    if v_email_count >= 3 then
      return false;
    end if;
  end if;

  -- Logg forsøket
  insert into public.signup_attempts (ip_address, email, success)
  values (p_ip, nullif(lower(trim(p_email)), ''), false);

  return true;
end $$;

revoke execute on function public.check_signup_rate_limit(text, text)
  from public, anon, authenticated;
grant execute on function public.check_signup_rate_limit(text, text)
  to service_role;

------------------------------------------------------------------
-- mark_signup_success
-- Etter vellykket signup: marker siste forsøk fra IP+epost som success.
-- Brukes ikke til limit-sjekk, kun for forensikk/debug.
------------------------------------------------------------------
create or replace function public.mark_signup_success(
  p_ip text,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.signup_attempts
  set success = true
  where id = (
    select id from public.signup_attempts
    where ip_address = p_ip
      and email = lower(trim(p_email))
    order by attempted_at desc
    limit 1
  );
end $$;

revoke execute on function public.mark_signup_success(text, text)
  from public, anon, authenticated;
grant execute on function public.mark_signup_success(text, text)
  to service_role;

------------------------------------------------------------------
-- Rydd opp eldre enn 7 dager. Kall fra cron eller scheduled function.
------------------------------------------------------------------
create or replace function public.purge_old_signup_attempts()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.signup_attempts
  where attempted_at < now() - interval '7 days';
$$;

revoke execute on function public.purge_old_signup_attempts()
  from public, anon, authenticated;
grant execute on function public.purge_old_signup_attempts() to service_role;
