-- SRM-MS baseline schema (aligned with UC diagram + front SimData)

CREATE TABLE organizational_entities (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(64)  NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    entity_type     VARCHAR(64)  NOT NULL,
    parent_id       BIGINT REFERENCES organizational_entities (id)
);

CREATE INDEX idx_org_entities_parent ON organizational_entities (parent_id);

CREATE TABLE agents (
    id              BIGSERIAL PRIMARY KEY,
    matricule       VARCHAR(32)  NOT NULL UNIQUE,
    nom             VARCHAR(120) NOT NULL,
    prenom          VARCHAR(120) NOT NULL,
    cin             VARCHAR(32),
    date_naissance  DATE,
    situation       VARCHAR(64),
    entite_name     VARCHAR(255) NOT NULL,
    telephone       VARCHAR(32),
    email           VARCHAR(255)
);

CREATE TABLE beneficiaries (
    id              BIGSERIAL PRIMARY KEY,
    agent_id        BIGINT NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
    nom             VARCHAR(120) NOT NULL,
    prenom          VARCHAR(120) NOT NULL,
    link_type       VARCHAR(32)  NOT NULL,
    cin             VARCHAR(32),
    date_naissance  DATE
);

CREATE INDEX idx_beneficiaries_agent ON beneficiaries (agent_id);

CREATE TABLE medical_facilities (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    facility_type   VARCHAR(64)  NOT NULL,
    address         VARCHAR(512),
    phone           VARCHAR(32)
);

CREATE TABLE contracted_doctors (
    id                   BIGSERIAL PRIMARY KEY,
    medical_facility_id  BIGINT NOT NULL REFERENCES medical_facilities (id) ON DELETE CASCADE,
    full_name            VARCHAR(255) NOT NULL
);

CREATE INDEX idx_doctors_facility ON contracted_doctors (medical_facility_id);

CREATE TABLE medicines (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(255) NOT NULL UNIQUE,
    reimbursed   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE ordonnances (
    id                    BIGSERIAL PRIMARY KEY,
    numero                VARCHAR(64) NOT NULL UNIQUE,
    ord_date              DATE NOT NULL,
    agent_id              BIGINT NOT NULL REFERENCES agents (id),
    beneficiaire          VARCHAR(255) NOT NULL,
    type_prestation       VARCHAR(64) NOT NULL,
    montant               NUMERIC(14, 2) NOT NULL,
    montant_remboursable  NUMERIC(14, 2) NOT NULL,
    taux                  INTEGER NOT NULL,
    status                VARCHAR(32) NOT NULL
);

CREATE INDEX idx_ordonnances_agent ON ordonnances (agent_id);

CREATE TABLE quotes (
    id            BIGSERIAL PRIMARY KEY,
    numero        VARCHAR(64) NOT NULL UNIQUE,
    quote_type    VARCHAR(64) NOT NULL,
    quote_date    DATE NOT NULL,
    agent_id      BIGINT NOT NULL REFERENCES agents (id),
    beneficiaire  VARCHAR(255) NOT NULL,
    montant       NUMERIC(14, 2) NOT NULL,
    taux          INTEGER NOT NULL,
    etat          VARCHAR(32) NOT NULL
);

CREATE INDEX idx_quotes_agent ON quotes (agent_id);

CREATE TABLE reimbursements (
    id                 BIGSERIAL PRIMARY KEY,
    numero             VARCHAR(64) NOT NULL UNIQUE,
    reimbursement_date DATE NOT NULL,
    agent_id           BIGINT NOT NULL REFERENCES agents (id),
    beneficiaire       VARCHAR(255) NOT NULL,
    montant_demande    NUMERIC(14, 2) NOT NULL,
    montant_valide     NUMERIC(14, 2) NOT NULL,
    status             VARCHAR(32) NOT NULL
);

CREATE INDEX idx_reimbursements_agent ON reimbursements (agent_id);

CREATE TABLE care_episodes (
    id                  BIGSERIAL PRIMARY KEY,
    numero              VARCHAR(64) NOT NULL UNIQUE,
    type_prestation     VARCHAR(128) NOT NULL,
    date_debut          DATE NOT NULL,
    date_fin            DATE,
    agent_id            BIGINT NOT NULL REFERENCES agents (id),
    beneficiaire        VARCHAR(255) NOT NULL,
    establishment_name  VARCHAR(255) NOT NULL,
    status              VARCHAR(32) NOT NULL
);

CREATE INDEX idx_care_episodes_agent ON care_episodes (agent_id);

CREATE TABLE special_disease_declarations (
    id               BIGSERIAL PRIMARY KEY,
    numero           VARCHAR(64) NOT NULL UNIQUE,
    disease_type     VARCHAR(128) NOT NULL,
    declaration_date DATE NOT NULL,
    agent_id         BIGINT NOT NULL REFERENCES agents (id),
    beneficiaire     VARCHAR(255) NOT NULL,
    status           VARCHAR(32) NOT NULL
);

CREATE INDEX idx_special_disease_agent ON special_disease_declarations (agent_id);

CREATE TABLE mutual_cards (
    id               BIGSERIAL PRIMARY KEY,
    agent_id         BIGINT NOT NULL UNIQUE REFERENCES agents (id) ON DELETE CASCADE,
    issued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pdf_storage_key  VARCHAR(512)
);

CREATE TABLE app_users (
    id               BIGSERIAL PRIMARY KEY,
    email            VARCHAR(255) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    full_name        VARCHAR(255) NOT NULL,
    role             VARCHAR(32) NOT NULL,
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    agent_id         BIGINT UNIQUE REFERENCES agents (id),
    last_login_at    TIMESTAMPTZ,
    CONSTRAINT ck_app_users_role CHECK (role IN ('ADMINISTRATEUR', 'OPERATEUR', 'CONSULTATEUR', 'ADHERENT')),
    CONSTRAINT ck_app_users_agent_role CHECK (
        (role = 'ADHERENT' AND agent_id IS NOT NULL)
        OR (role <> 'ADHERENT' AND agent_id IS NULL)
    )
);

CREATE INDEX idx_app_users_agent ON app_users (agent_id);

CREATE TABLE notifications (
    id           BIGSERIAL PRIMARY KEY,
    app_user_id  BIGINT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    notif_type   VARCHAR(64) NOT NULL,
    read_flag    BOOLEAN NOT NULL DEFAULT FALSE,
    body         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (app_user_id);
