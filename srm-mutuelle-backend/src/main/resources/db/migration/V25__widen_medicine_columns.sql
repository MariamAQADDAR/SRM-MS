-- Migration V25 : Agrandissement des colonnes medicines
-- form: 80 -> 200 (FORME peut atteindre 155 chars dans USER_COS.MEDICAMENT)
-- therapeutic_class: 120 -> 150 (CLASSE_THERAPEUTIQUE peut atteindre 123 chars)
ALTER TABLE medicines ALTER COLUMN form TYPE VARCHAR(200);
ALTER TABLE medicines ALTER COLUMN therapeutic_class TYPE VARCHAR(150);
