-- Legg til SJA (Sikker Jobb Analyse) som dokumenttype.
--
-- VIKTIG: Kjør denne ALENE (PostgreSQL tillater ikke ny enum-verdi i
-- samme transaksjon som den brukes).

alter type document_kind add value if not exists 'sja';
