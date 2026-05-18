ALTER TABLE quotes
    ADD COLUMN pdf_storage_key VARCHAR(512),
    ADD COLUMN pdf_original_name VARCHAR(255),
    ADD COLUMN dentist_name VARCHAR(255),
    ADD COLUMN deposit_date DATE,
    ADD COLUMN sent_date DATE,
    ADD COLUMN response_date DATE,
    ADD COLUMN montant_pris_en_charge NUMERIC(14, 2),
    ADD COLUMN observation TEXT;
