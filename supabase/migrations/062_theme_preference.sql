-- 062_theme_preference.sql
-- Lar hver bruker velge mellom lyst tema ("Lin", default) og mørkt.
-- Valget lagres per bruker — ikke per org — siden temapreferanse er
-- personlig og uavhengig av arbeidsgiver.

do $$ begin
  create type theme_choice as enum ('lin', 'dark');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists theme_preference theme_choice not null default 'lin';
