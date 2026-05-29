UPDATE app_type_config
SET values_json = '["Direction générale", "Direction", "Département", "Division", "Service"]'::jsonb
WHERE config_key = 'entityTypes';
