-- 078_must_change_password.sql
-- A6/I-01, F-23: admin oppretter i dag brukere med et midlertidig passord
-- som formidles på SMS/muntlig — uten dette flagget fikk brukeren ingen
-- beskjed om å bytte det ved første innlogging, og /profil hadde ingen
-- "Endre passord"-vei (kun "Glemt passord?").
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
