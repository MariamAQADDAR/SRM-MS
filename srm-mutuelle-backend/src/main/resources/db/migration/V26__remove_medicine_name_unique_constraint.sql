-- Migration V26 : Suppression de la contrainte unique sur le nom des medicaments
ALTER TABLE medicines DROP CONSTRAINT IF EXISTS medicines_name_key;
