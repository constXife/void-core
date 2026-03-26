ALTER TABLE spaces
    ADD COLUMN IF NOT EXISTS access_mode VARCHAR(30) DEFAULT 'private';

ALTER TABLE spaces
    ADD COLUMN IF NOT EXISTS is_default_public_entry BOOLEAN DEFAULT false;

ALTER TABLE spaces
    ADD COLUMN IF NOT EXISTS public_entry JSONB DEFAULT '{}'::jsonb;

UPDATE spaces
SET access_mode = COALESCE(access_mode, 'private'),
    public_entry = COALESCE(public_entry, '{}'::jsonb);
