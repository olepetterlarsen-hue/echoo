-- OPControl: én RPC for "Mine oppgaver"-badge istedenfor 3 separate counts.
-- Kalt fra MyTasksBadge hver 60 sek + ved Realtime-events.
-- security definer: kjøres med eier-rettigheter, men begrenser til auth.uid().

create or replace function public.get_my_open_counts()
returns table (
  tasks_count integer,
  deviations_count integer,
  certs_expiring_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    return query select 0, 0, 0;
    return;
  end if;

  return query
  select
    (select count(*)::integer
       from public.tasks
       where assigned_to = uid and status <> 'resolved'),
    (select count(*)::integer
       from public.deviations
       where assigned_to = uid and status <> 'lukket'),
    (select count(*)::integer
       from public.certificates
       where profile_id = uid
         and expires_date is not null
         and expires_date <= (now() + interval '90 days')::date);
end;
$$;

grant execute on function public.get_my_open_counts() to authenticated;

comment on function public.get_my_open_counts() is
  'Returnerer åpne saker for innlogget bruker. Brukes av sidebar-badge.';
