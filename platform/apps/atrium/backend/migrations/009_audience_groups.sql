ALTER TABLE announcements
    ADD COLUMN IF NOT EXISTS audience_groups JSONB DEFAULT '[]'::jsonb;

ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS audience_groups JSONB DEFAULT '[]'::jsonb;

ALTER TABLE directory_items
    ADD COLUMN IF NOT EXISTS audience_groups JSONB DEFAULT '[]'::jsonb;
