-- Demande de prise en charge : workflow adhérent, PDF, montants et taux
ALTER TABLE care_episodes
    ADD COLUMN IF NOT EXISTS montant_demande NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS montant_pris_en_charge NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS taux INTEGER,
    ADD COLUMN IF NOT EXISTS pdf_storage_key VARCHAR(512),
    ADD COLUMN IF NOT EXISTS pdf_original_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS deposit_date DATE,
    ADD COLUMN IF NOT EXISTS sent_date DATE,
    ADD COLUMN IF NOT EXISTS response_date DATE,
    ADD COLUMN IF NOT EXISTS observation TEXT;

UPDATE care_episodes
SET deposit_date = date_debut
WHERE deposit_date IS NULL;

UPDATE care_episodes
SET montant_demande = 0
WHERE montant_demande IS NULL;

UPDATE care_episodes
SET montant_pris_en_charge = 0
WHERE montant_pris_en_charge IS NULL;

UPDATE care_episodes
SET status = 'Clôturé'
WHERE status IS NULL OR TRIM(status) = '';
