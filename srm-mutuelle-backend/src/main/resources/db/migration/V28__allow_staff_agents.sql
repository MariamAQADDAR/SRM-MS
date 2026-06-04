-- Drop the constraint restricting agent_id to ADHERENT role only
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS ck_app_users_agent_role;

-- Add a new check constraint that allows any role to have an agent_id, but ADHERENT must have it
ALTER TABLE app_users ADD CONSTRAINT ck_app_users_agent_role CHECK (
    (role = 'ADHERENT' AND agent_id IS NOT NULL)
    OR (role <> 'ADHERENT')
);

-- Seed new agents for the staff members (ignore if they already exist in some environments)
INSERT INTO agents (matricule, nom, prenom, cin, date_naissance, situation, entite_name, telephone, email) VALUES
    ('AGT-ADMIN', 'AQADDAR', 'Marieme', 'BK000001', '1988-01-01', 'Mariée', 'Direction SI & Transformation Digitale', '0600000001', 'admin@srm-ms.ma'),
    ('AGT-OPER', 'Benali', 'Youssef', 'BK000002', '1989-02-02', 'Célibataire', 'Direction SI & Transformation Digitale', '0600000002', 'operateur@srm-ms.ma'),
    ('AGT-CONS', 'Zahrae', 'Fatima', 'BK000003', '1990-03-03', 'Célibataire', 'Direction SI & Transformation Digitale', '0600000003', 'consult@srm-ms.ma')
ON CONFLICT (matricule) DO NOTHING;

-- Link the newly created agents to their respective users in app_users
UPDATE app_users SET agent_id = (SELECT id FROM agents WHERE matricule = 'AGT-ADMIN') WHERE email = 'admin@srm-ms.ma';
UPDATE app_users SET agent_id = (SELECT id FROM agents WHERE matricule = 'AGT-OPER') WHERE email = 'operateur@srm-ms.ma';
UPDATE app_users SET agent_id = (SELECT id FROM agents WHERE matricule = 'AGT-CONS') WHERE email = 'consult@srm-ms.ma';
