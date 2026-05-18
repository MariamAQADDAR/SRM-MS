-- Purge démo liée aux porteurs (devis, ordonnances, etc.) et agents sans bénéficiaire.
-- Les bénéficiaires et leurs porteurs rattachés sont conservés.

DELETE FROM notifications;

DELETE FROM notification_broadcasts;

DELETE FROM quotes;

DELETE FROM ordonnances;

DELETE FROM reimbursements;

DELETE FROM care_episodes;

DELETE FROM special_disease_declarations;

DELETE FROM mutual_cards;

-- Comptes adhérents liés à des agents qui seront supprimés
DELETE FROM app_users
WHERE role = 'ADHERENT'
  AND agent_id IS NOT NULL
  AND agent_id NOT IN (SELECT DISTINCT agent_id FROM beneficiaries);

-- Porteurs sans aucun bénéficiaire
DELETE FROM agents
WHERE id NOT IN (SELECT DISTINCT agent_id FROM beneficiaries);

SELECT setval(pg_get_serial_sequence('quotes', 'id'), COALESCE((SELECT MAX(id) FROM quotes), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('ordonnances', 'id'), COALESCE((SELECT MAX(id) FROM ordonnances), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('reimbursements', 'id'), COALESCE((SELECT MAX(id) FROM reimbursements), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('care_episodes', 'id'), COALESCE((SELECT MAX(id) FROM care_episodes), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('special_disease_declarations', 'id'), COALESCE((SELECT MAX(id) FROM special_disease_declarations), 0) + 1, false);
