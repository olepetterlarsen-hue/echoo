-- OPControl: per-kunde kartfarge for marker-visualisering på /kart.
-- NULL = bruk OPCOM-oransje (#F47920) default.
-- Lagres som hex-string (#RRGGBB).

alter table public.customers
  add column if not exists map_color text;

comment on column public.customers.map_color is
  'Hex-farge (#RRGGBB) brukt for kundens sites i kartet. NULL = OPCOM-oransje.';
