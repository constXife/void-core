-- Add is_pinned column for Dock favorites
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Add description column for service onboarding
ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT;



