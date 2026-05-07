-- Reference data aligned with srm-mutuelle-web SimData (users seeded in Java)

INSERT INTO organizational_entities (id, code, name, entity_type, parent_id) VALUES
    (1, 'DIR-FIN', 'Direction Financière', 'Direction', NULL),
    (2, 'DIR-RH', 'Direction RH', 'Direction', NULL),
    (3, 'DIR-SI', 'Direction SI & Transformation Digitale', 'Direction', NULL),
    (4, 'DIR-TECH', 'Direction Technique', 'Direction', NULL),
    (5, 'DIR-COM', 'Direction Commerciale', 'Direction', NULL),
    (6, 'DIR-JUR', 'Direction Juridique', 'Direction', NULL),
    (7, 'DEP-TD', 'Département Transformation Digitale', 'Département', 3),
    (8, 'SRV-INT', 'Service d''Intégration SI', 'Service', 7),
    (9, 'SRV-PAI', 'Service Paie', 'Service', 2),
    (10, 'DIV-OS', 'Division Œuvres Sociales', 'Division', 2);

SELECT setval(pg_get_serial_sequence('organizational_entities', 'id'), (SELECT MAX(id) FROM organizational_entities));

INSERT INTO agents (id, matricule, nom, prenom, cin, date_naissance, situation, entite_name, telephone, email) VALUES
    (1, 'AGT-001', 'Benali', 'Youssef', 'BK432198', '1985-03-15', 'Marié', 'Direction Financière', '0661234567', 'y.benali@srm-ms.ma'),
    (2, 'AGT-002', 'El Amrani', 'Fatima', 'BK541122', '1990-07-22', 'Célibataire', 'Direction RH', '0667891234', 'f.amrani@srm-ms.ma'),
    (3, 'AGT-003', 'Ouazzani', 'Mohamed', 'BK765432', '1978-11-03', 'Marié', 'Direction Technique', '0670001122', 'm.ouazzani@srm-ms.ma'),
    (4, 'AGT-004', 'Tazi', 'Amina', 'BK112233', '1992-01-20', 'Célibataire', 'Direction SI', '0655443322', 'a.tazi@srm-ms.ma'),
    (5, 'AGT-005', 'Cherkaoui', 'Hassan', 'BK998877', '1982-05-10', 'Marié', 'Direction Commerciale', '0699887766', 'h.cherkaoui@srm-ms.ma'),
    (6, 'AGT-006', 'Alaoui', 'Sara', 'BK667788', '1995-09-14', 'Célibataire', 'Direction Juridique', '0612345678', 's.alaoui@srm-ms.ma'),
    (7, 'AGT-007', 'Idrissi', 'Karim', 'BK223344', '1980-12-25', 'Marié', 'Direction Financière', '0688990011', 'k.idrissi@srm-ms.ma'),
    (8, 'AGT-008', 'Bouazza', 'Khadija', 'BK445566', '1988-06-30', 'Mariée', 'Direction RH', '0677665544', 'k.bouazza@srm-ms.ma');

SELECT setval(pg_get_serial_sequence('agents', 'id'), (SELECT MAX(id) FROM agents));

INSERT INTO beneficiaries (id, agent_id, nom, prenom, link_type, cin, date_naissance) VALUES
    (1, 1, 'Benali', 'Nadia', 'Conjoint', 'BK111222', '1987-04-12'),
    (2, 1, 'Benali', 'Adam', 'Enfant', '', '2012-09-08'),
    (3, 1, 'Benali', 'Aya', 'Enfant', '', '2015-02-14'),
    (4, 3, 'Ouazzani', 'Laila', 'Conjoint', 'BK333444', '1980-08-20'),
    (5, 3, 'Ouazzani', 'Ilyas', 'Enfant', '', '2010-03-05'),
    (6, 5, 'Cherkaoui', 'Samira', 'Conjoint', 'BK555666', '1985-11-15'),
    (7, 7, 'Idrissi', 'Houda', 'Conjoint', 'BK777888', '1983-07-22'),
    (8, 7, 'Idrissi', 'Rayan', 'Enfant', '', '2018-01-10');

SELECT setval(pg_get_serial_sequence('beneficiaries', 'id'), (SELECT MAX(id) FROM beneficiaries));

INSERT INTO medical_facilities (id, name, facility_type, address, phone) VALUES
    (1, 'CHU Mohammed VI', 'Hôpital', 'Bd Mohammed VI, Marrakech', '0524-123456'),
    (2, 'Clinique Al Farabi', 'Clinique', 'Rue Ibn Sina, Guéliz', '0524-654321'),
    (3, 'Clinique Atlas', 'Clinique', 'Avenue Hassan II, Marrakech', '0524-111222'),
    (4, 'Optique Vision Plus', 'Opticien', 'Bd Zerktouni, Guéliz', '0524-333444'),
    (5, 'Laboratoire BioMed', 'Laboratoire', 'Rue de Liberté, Marrakech', '0524-555666');

SELECT setval(pg_get_serial_sequence('medical_facilities', 'id'), (SELECT MAX(id) FROM medical_facilities));

INSERT INTO contracted_doctors (medical_facility_id, full_name) VALUES
    (1, 'Dr. Rachidi'),
    (1, 'Dr. Benhima'),
    (2, 'Dr. Tahiri'),
    (2, 'Dr. Amrani'),
    (3, 'Dr. Fassi'),
    (3, 'Dr. Ouahhabi'),
    (5, 'Dr. Lahlou');

INSERT INTO medicines (name, reimbursed) VALUES
    ('Paracétamol 500mg', TRUE),
    ('Amoxicilline 1g', TRUE),
    ('Insuline rapide', TRUE);

INSERT INTO ordonnances (id, numero, ord_date, agent_id, beneficiaire, type_prestation, montant, montant_remboursable, taux, status) VALUES
    (1, 'ORD-2025-001', '2025-01-15', 1, 'Youssef Benali', 'Médicament', 450.00, 360.00, 80, 'Traité'),
    (2, 'ORD-2025-002', '2025-01-22', 2, 'Fatima El Amrani', 'Analyse', 800.00, 640.00, 80, 'Traité'),
    (3, 'ORD-2025-003', '2025-02-03', 3, 'Laila Ouazzani', 'Radiologie', 1200.00, 840.00, 70, 'En cours'),
    (4, 'ORD-2025-004', '2025-02-10', 1, 'Adam Benali', 'Médicament', 230.00, 184.00, 80, 'Traité'),
    (5, 'ORD-2025-005', '2025-02-18', 5, 'Hassan Cherkaoui', 'Analyse', 550.00, 440.00, 80, 'En attente'),
    (6, 'ORD-2025-006', '2025-03-01', 4, 'Amina Tazi', 'Médicament', 150.00, 120.00, 80, 'Traité'),
    (7, 'ORD-2025-007', '2025-03-05', 6, 'Sara Alaoui', 'Radiologie', 900.00, 630.00, 70, 'En cours');

SELECT setval(pg_get_serial_sequence('ordonnances', 'id'), (SELECT MAX(id) FROM ordonnances));

INSERT INTO quotes (id, numero, quote_type, quote_date, agent_id, beneficiaire, montant, taux, etat) VALUES
    (1, 'DEV-2025-001', 'Optique', '2025-01-20', 1, 'Youssef Benali', 2500.00, 60, 'Approuvé'),
    (2, 'DEV-2025-002', 'Dentaire', '2025-02-05', 3, 'Ilyas Ouazzani', 3800.00, 50, 'En attente'),
    (3, 'DEV-2025-003', 'Optique', '2025-02-14', 2, 'Fatima El Amrani', 1800.00, 60, 'Approuvé'),
    (4, 'DEV-2025-004', 'Dentaire', '2025-02-28', 5, 'Samira Cherkaoui', 5200.00, 50, 'Rejeté'),
    (5, 'DEV-2025-005', 'Optique', '2025-03-10', 7, 'Houda Idrissi', 2200.00, 60, 'En attente');

SELECT setval(pg_get_serial_sequence('quotes', 'id'), (SELECT MAX(id) FROM quotes));

INSERT INTO reimbursements (id, numero, reimbursement_date, agent_id, beneficiaire, montant_demande, montant_valide, status) VALUES
    (1, 'RMB-2025-001', '2025-01-25', 1, 'Youssef Benali', 360.00, 360.00, 'Traité'),
    (2, 'RMB-2025-002', '2025-02-01', 2, 'Fatima El Amrani', 640.00, 640.00, 'Traité'),
    (3, 'RMB-2025-003', '2025-02-12', 3, 'Laila Ouazzani', 840.00, 0, 'En cours'),
    (4, 'RMB-2025-004', '2025-02-20', 1, 'Adam Benali', 184.00, 184.00, 'Traité'),
    (5, 'RMB-2025-005', '2025-03-02', 5, 'Hassan Cherkaoui', 440.00, 0, 'En attente'),
    (6, 'RMB-2025-006', '2025-03-08', 1, 'Nadia Benali', 1500.00, 0, 'En attente');

SELECT setval(pg_get_serial_sequence('reimbursements', 'id'), (SELECT MAX(id) FROM reimbursements));

INSERT INTO care_episodes (id, numero, type_prestation, date_debut, date_fin, agent_id, beneficiaire, establishment_name, status) VALUES
    (1, 'PEC-2025-001', 'Hospitalisation', '2025-01-10', '2025-01-15', 3, 'Mohamed Ouazzani', 'Clinique Al Farabi', 'Clôturé'),
    (2, 'PEC-2025-002', 'Chirurgie', '2025-02-01', '2025-02-03', 1, 'Nadia Benali', 'CHU Mohammed VI', 'En cours'),
    (3, 'PEC-2025-003', 'Maternité', '2025-03-01', NULL, 8, 'Khadija Bouazza', 'Clinique Atlas', 'En attente');

SELECT setval(pg_get_serial_sequence('care_episodes', 'id'), (SELECT MAX(id) FROM care_episodes));

INSERT INTO special_disease_declarations (id, numero, disease_type, declaration_date, agent_id, beneficiaire, status) VALUES
    (1, 'MLD-2025-001', 'Diabète', '2024-06-15', 3, 'Mohamed Ouazzani', 'Validé'),
    (2, 'MLD-2025-002', 'Hypertension', '2024-09-20', 7, 'Karim Idrissi', 'Validé'),
    (3, 'MLD-2025-003', 'Asthme', '2025-01-05', 1, 'Adam Benali', 'En cours');

SELECT setval(pg_get_serial_sequence('special_disease_declarations', 'id'), (SELECT MAX(id) FROM special_disease_declarations));

INSERT INTO mutual_cards (agent_id, pdf_storage_key) VALUES
    (1, NULL), (2, NULL), (3, NULL), (4, NULL), (5, NULL), (6, NULL), (7, NULL), (8, NULL);
