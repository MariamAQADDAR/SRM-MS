ALTER TABLE app_users ADD COLUMN reset_token VARCHAR(255) UNIQUE;
ALTER TABLE app_users ADD COLUMN reset_token_expiry TIMESTAMP;
