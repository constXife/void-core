ALTER TABLE spaces
    ADD COLUMN IF NOT EXISTS space_type VARCHAR(30) DEFAULT 'audience';

ALTER TABLE spaces
    ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES spaces(id) ON DELETE SET NULL;

ALTER TABLE spaces
    ADD COLUMN IF NOT EXISTS dashboard_template_id INT REFERENCES dashboard_templates(id);

ALTER TABLE spaces
    ADD COLUMN IF NOT EXISTS personalization_rules JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_spaces_parent ON spaces(parent_id);
