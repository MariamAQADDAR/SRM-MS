-- Chaque agent est rattaché à une entité organisationnelle de type « Service ».
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS organizational_entity_id BIGINT REFERENCES organizational_entities (id);

CREATE INDEX IF NOT EXISTS idx_agents_org_entity ON agents (organizational_entity_id);

-- Rattachement par nom exact (après migration V19).
UPDATE agents a
SET organizational_entity_id = oe.id
FROM organizational_entities oe
WHERE a.organizational_entity_id IS NULL
  AND oe.deleted = FALSE
  AND oe.entity_type = 'Service'
  AND oe.name = a.entite_name;

-- Agents sans correspondance → service mutuelle (DAF).
UPDATE agents a
SET organizational_entity_id = sub.id,
    entite_name = sub.name
FROM (
    SELECT id, name
    FROM organizational_entities
    WHERE deleted = FALSE
      AND code = 'SRV-DAF-MUT'
    LIMIT 1
) sub
WHERE a.organizational_entity_id IS NULL;
