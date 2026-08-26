-- 076_newsletter_consent.sql
-- Lagrer eksplisitt nyhetsbrev-samtykke på profilen (GDPR-krav).
-- marketing_consent_at er tidsstempel for når samtykket ble gitt — bevis for revisjon.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;
