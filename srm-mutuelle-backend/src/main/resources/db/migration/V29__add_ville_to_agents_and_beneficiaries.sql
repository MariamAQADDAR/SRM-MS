-- V29__add_ville_to_agents_and_beneficiaries.sql
ALTER TABLE agents ADD COLUMN ville VARCHAR(120);
ALTER TABLE beneficiaries ADD COLUMN ville VARCHAR(120);
