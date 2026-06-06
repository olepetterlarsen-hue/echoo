-- Lås på off-perioder (samme pattern som schedule_entries)
-- Låste perioder kan ikke flyttes eller endres uten å låses opp først.

alter table public.schedule_off_periods
  add column if not exists locked boolean not null default false,
  add column if not exists locked_reason text;

comment on column public.schedule_off_periods.locked is
  'Lås for å hindre at perioden flyttes/redigeres. Krever locked_reason når låst.';
