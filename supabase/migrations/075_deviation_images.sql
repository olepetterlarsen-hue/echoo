-- 075_deviation_images.sql
-- Legger til bildestøtte på avvik. Bilder lastes opp til Storage-bucketen
-- "avvik" og URL-ene lagres som array. Maks 10 bilder per avvik.

ALTER TABLE deviations
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- Storage-bucket opprettes fra kode (eller Dashboard) — SQL-siden er bare kolonnen.
