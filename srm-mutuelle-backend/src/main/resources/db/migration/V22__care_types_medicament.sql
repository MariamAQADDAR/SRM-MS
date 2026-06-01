-- Ajout Médicament et Consultation aux types de soins (remboursements / PEC).
UPDATE app_type_config
SET values_json = '["Hospitalisation", "Chirurgie", "Maternité", "Médicament", "Consultation", "Autre"]'::jsonb
WHERE config_key = 'careTypes';
