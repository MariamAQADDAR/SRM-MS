-- Demandes de cartes mutuelles (workflow : dépôt → validation → émission PDF).
CREATE TABLE IF NOT EXISTS mutual_card_requests (
    id              BIGSERIAL PRIMARY KEY,
    agent_id        BIGINT       NOT NULL REFERENCES agents (id),
    beneficiary_id  BIGINT       REFERENCES beneficiaries (id),
    beneficiary_name VARCHAR(255) NOT NULL,
    request_type    VARCHAR(64)  NOT NULL,
    request_date    DATE         NOT NULL DEFAULT CURRENT_DATE,
    status          VARCHAR(32)  NOT NULL DEFAULT 'En attente',
    reason          TEXT,
    deleted         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcr_agent ON mutual_card_requests (agent_id);
CREATE INDEX IF NOT EXISTS idx_mcr_status ON mutual_card_requests (status);
CREATE INDEX IF NOT EXISTS idx_mcr_deleted ON mutual_card_requests (deleted);

INSERT INTO mutual_card_requests (agent_id, beneficiary_id, beneficiary_name, request_type, request_date, status, reason)
SELECT a.id, NULL, a.prenom || ' ' || a.nom, 'Adhésion (Première carte)', DATE '2026-05-13', 'Accordée', NULL
FROM agents a
WHERE a.matricule = 'AGT-001'
  AND NOT EXISTS (SELECT 1 FROM mutual_card_requests);

INSERT INTO mutual_card_requests (agent_id, beneficiary_id, beneficiary_name, request_type, request_date, status, reason)
SELECT a.id, b.id, b.prenom || ' ' || b.nom, 'Adhésion (Première carte)', DATE '2026-05-14', 'En attente', NULL
FROM agents a
JOIN beneficiaries b ON b.agent_id = a.id AND b.deleted = FALSE
WHERE a.matricule = 'AGT-001'
  AND b.link_type = 'Enfant'
  AND NOT EXISTS (SELECT 1 FROM mutual_card_requests WHERE agent_id = a.id AND beneficiary_id = b.id)
LIMIT 1;
