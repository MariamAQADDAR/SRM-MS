-- Données métier réelles saisies via l'application (plus de dossiers / cartes démo V2).

DELETE FROM notifications;
DELETE FROM notification_broadcasts;
DELETE FROM quotes;
DELETE FROM ordonnances;
DELETE FROM reimbursements;
DELETE FROM care_episodes;
DELETE FROM special_disease_declarations;
DELETE FROM mutual_cards;

ALTER TABLE mutual_cards DROP CONSTRAINT IF EXISTS mutual_cards_agent_id_key;

ALTER TABLE mutual_cards
    ADD COLUMN IF NOT EXISTS beneficiary_id BIGINT REFERENCES beneficiaries (id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS card_label VARCHAR(32) NOT NULL DEFAULT 'Titulaire',
    ADD COLUMN IF NOT EXISTS holder_nom VARCHAR(120),
    ADD COLUMN IF NOT EXISTS holder_prenom VARCHAR(120),
    ADD COLUMN IF NOT EXISTS holder_cin VARCHAR(32),
    ADD COLUMN IF NOT EXISTS holder_date_naissance DATE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mutual_cards_agent_titulaire
    ON mutual_cards (agent_id) WHERE beneficiary_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mutual_cards_agent_beneficiary
    ON mutual_cards (agent_id, beneficiary_id) WHERE beneficiary_id IS NOT NULL;

SELECT setval(pg_get_serial_sequence('quotes', 'id'), COALESCE((SELECT MAX(id) FROM quotes), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('ordonnances', 'id'), COALESCE((SELECT MAX(id) FROM ordonnances), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('reimbursements', 'id'), COALESCE((SELECT MAX(id) FROM reimbursements), 0) + 1, false);
