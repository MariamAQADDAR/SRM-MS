-- Ajout du champ OBSERVATION à la table medicines
-- Correspond à la colonne OBSERVATION de USER_COS.MEDICAMENT
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS observation VARCHAR(1000);
