ALTER TABLE spaces
    ADD COLUMN IF NOT EXISTS provisioning_state VARCHAR(20) DEFAULT 'active';

UPDATE spaces
SET provisioning_state = CASE
    WHEN is_provisioned = true THEN 'active'
    ELSE 'archived'
END
WHERE provisioning_state IS NULL
   OR provisioning_state = '';
