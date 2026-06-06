-- Internkontroll som dokumenttype.
-- VIKTIG: Kjør ALENE.

alter type document_kind add value if not exists 'internkontroll';
