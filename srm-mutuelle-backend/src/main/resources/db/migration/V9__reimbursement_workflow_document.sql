ALTER TABLE reimbursements
    ADD COLUMN IF NOT EXISTS pdf_storage_key VARCHAR(512),
    ADD COLUMN IF NOT EXISTS pdf_original_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS establishment_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS care_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS medicine_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS deposit_date DATE,
    ADD COLUMN IF NOT EXISTS sent_date DATE,
    ADD COLUMN IF NOT EXISTS response_date DATE,
    ADD COLUMN IF NOT EXISTS observation TEXT,
    ADD COLUMN IF NOT EXISTS taux INTEGER;

UPDATE reimbursements SET taux = 80 WHERE taux IS NULL AND montant_demande > 0 AND montant_valide > 0;
UPDATE reimbursements SET taux = ROUND((montant_valide / montant_demande) * 100)::INTEGER
WHERE taux IS NULL AND montant_demande > 0 AND montant_valide > 0;
