-- Configuration des listes de types (paramétrage applicatif)
CREATE TABLE app_type_config (
    config_key VARCHAR(64) PRIMARY KEY,
    values_json JSONB NOT NULL
);

INSERT INTO app_type_config (config_key, values_json) VALUES
    ('quoteTypes', '["Optique", "Dentaire"]'::jsonb),
    ('ordonnanceTypes', '["Médicament", "Analyse", "Radiologie"]'::jsonb),
    ('radioTypes', '["Radio standard", "IRM", "Scanner", "Échographie"]'::jsonb),
    ('careTypes', '["Hospitalisation", "Chirurgie", "Maternité", "Autre"]'::jsonb),
    ('facilityTypes', '["Hôpital", "Clinique", "Opticien", "Laboratoire"]'::jsonb),
    ('entityTypes', '["Direction", "Département", "Service", "Division"]'::jsonb),
    ('maladieTypes', '["Diabète", "Hypertension", "Cardiologie", "Autre"]'::jsonb);
